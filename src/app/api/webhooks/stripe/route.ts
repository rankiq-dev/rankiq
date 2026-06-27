import { NextRequest, NextResponse } from "next/server"
import { constructWebhookEvent, type Stripe } from "@/providers/billing"
import { getUserByStripeCustomerId, updateUserSubscription } from "@/db/repositories/users"
import { logger } from "@/infra/logger"
import type { Plan } from "@/lib/types"

/* Stripe sends the raw body; Next.js must NOT parse it — we need the raw bytes for signature verification */
export const runtime = "nodejs"


function getPlanFromPrice(priceId: string): Plan {
  const { STRIPE_STARTER_PRICE_ID, STRIPE_GROWTH_PRICE_ID, STRIPE_AGENCY_PRICE_ID } = process.env
  if (priceId === STRIPE_GROWTH_PRICE_ID)  return "growth"
  if (priceId === STRIPE_AGENCY_PRICE_ID)  return "agency"
  if (priceId === STRIPE_STARTER_PRICE_ID) return "starter"
  return "starter" // default — covers free/trial
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id

  const user = await getUserByStripeCustomerId(customerId)
  if (!user) {
    logger.warn({ customerId }, "Stripe webhook: no user found for customer")
    return
  }

  const item = subscription.items.data[0]
  const priceId = item?.price.id ?? ""
  const plan    = getPlanFromPrice(priceId)

  await updateUserSubscription(customerId, {
    plan,
    subscriptionStatus: subscription.status as Parameters<typeof updateUserSubscription>[1]["subscriptionStatus"],
    stripeSubscriptionId:   subscription.id,
    stripePriceId:          priceId,
    stripeCurrentPeriodEnd: subscription.current_period_end,
  })

  logger.info({ userId: user.id, plan, status: subscription.status }, "Subscription updated")
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const body = await req.arrayBuffer()
  const payload = Buffer.from(body)

  let event: Stripe.Event
  try {
    event = await constructWebhookEvent(payload, signature)
  } catch (err) {
    logger.warn({ err }, "Stripe webhook signature verification failed")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  logger.info({ eventId: event.id, eventType: event.type }, "Stripe webhook received")

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id
        const user = await getUserByStripeCustomerId(customerId)
        if (user) {
          await updateUserSubscription(customerId, {
            plan: "starter",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: sub.id,
            stripePriceId: "",
            stripeCurrentPeriodEnd: sub.current_period_end,
          })
          logger.info({ userId: user.id }, "Subscription canceled — downgraded to starter")
        }
        break
      }

      case "checkout.session.completed": {
        /* Subscription created via checkout — the subscription.created event handles state,
           this event just confirms payment flow completed. Log for audit trail. */
        const checkout = event.data.object as Stripe.Checkout.Session
        logger.info({ sessionId: checkout.id, customerId: checkout.customer }, "Checkout completed")
        break
      }

      default:
        logger.info({ eventType: event.type }, "Stripe webhook: unhandled event type (ignored)")
    }
  } catch (err) {
    logger.error({ eventId: event.id, err }, "Error processing Stripe webhook")
    return NextResponse.json({ error: "Processing error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
