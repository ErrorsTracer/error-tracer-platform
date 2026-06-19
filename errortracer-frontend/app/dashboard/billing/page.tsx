import { Check, CreditCard, Users, Activity, Zap, Server } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

const plans = [
  { name: "Free", price: "$0", features: ["1 app", "1,000 errors/mo", "7-day retention", "1 team member"], current: false },
  { name: "Pro", price: "$29", features: ["10 apps", "50,000 errors/mo", "30-day retention", "10 team members", "Slack integration"], current: true },
  { name: "Enterprise", price: "Custom", features: ["Unlimited apps", "Unlimited errors", "90-day retention", "Unlimited members", "SSO & SAML", "Dedicated support"], current: false },
]

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your plan and usage.</p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg border border-primary/30 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">Pro Plan</h3>
              <span className="inline-flex rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                Current
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Billed monthly. Next billing date: June 1, 2026</p>
          </div>
          <p className="text-2xl font-semibold text-foreground">
            $29<span className="text-sm text-muted-foreground">/mo</span>
          </p>
        </div>
      </div>

      {/* Usage */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="size-3.5" />
            Error Volume
          </div>
          <p className="mt-2 font-mono text-lg font-semibold text-foreground">12,847 <span className="text-sm text-muted-foreground">/ 50,000</span></p>
          <Progress value={26} className="mt-2 h-1.5" />
          <p className="mt-1 text-[10px] text-muted-foreground">26% used this period</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Team Seats
          </div>
          <p className="mt-2 font-mono text-lg font-semibold text-foreground">6 <span className="text-sm text-muted-foreground">/ 10</span></p>
          <Progress value={60} className="mt-2 h-1.5" />
          <p className="mt-1 text-[10px] text-muted-foreground">6 active members</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="size-3.5" />
            Applications
          </div>
          <p className="mt-2 font-mono text-lg font-semibold text-foreground">8 <span className="text-sm text-muted-foreground">/ 10</span></p>
          <Progress value={80} className="mt-2 h-1.5" />
          <p className="mt-1 text-[10px] text-muted-foreground">8 registered apps</p>
        </div>
      </div>

      {/* Plans */}
      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">Available Plans</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-lg border p-4 ${plan.current ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
            >
              <h4 className="text-sm font-semibold text-foreground">{plan.name}</h4>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {plan.price}
                {plan.price !== "Custom" && <span className="text-sm text-muted-foreground">/mo</span>}
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="size-3 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.current ? "outline" : "default"}
                size="sm"
                className="mt-4 w-full"
                disabled={plan.current}
              >
                {plan.current ? "Current Plan" : plan.price === "Custom" ? "Contact Sales" : "Upgrade"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Self-hosted */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Server className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Self-Hosted Deployment</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          ErrorTracer is open-source and can be self-hosted on your own infrastructure. Self-hosted deployments are free and include all enterprise features.
        </p>
        <Button variant="outline" size="sm" className="mt-3">
          View Self-Hosting Docs
        </Button>
      </div>
    </div>
  )
}
