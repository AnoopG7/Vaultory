import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@/components/ui'
import { forgotPasswordSchema } from '@/lib/schemas'
import { useAuthStore } from '@/stores'

export default function ForgotPasswordPage() {
  const forgotPassword = useAuthStore((s) => s.forgotPassword)
  const isLoading = useAuthStore((s) => s.isLoading)
  const [sent, setSent] = useState(false)

  const form = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: { email: string }) {
    try {
      await forgotPassword(values.email)
      setSent(true)
    } catch {
      // error surfaced via store.error
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              If that email is registered, a password-reset link has been sent. Follow the link to set a
              new password.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <div className="flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Vaultory</h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>Enter your email and we'll send you a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@company.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" />}
                Send reset link
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">
              <ArrowLeft /> Back to sign in
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
