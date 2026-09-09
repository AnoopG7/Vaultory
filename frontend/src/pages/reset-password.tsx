import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Sparkles } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  PasswordInput,
} from '@/components/ui'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/schemas'
import { useAuthStore } from '@/stores'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resetPassword = useAuthStore((s) => s.resetPassword)
  const isLoading = useAuthStore((s) => s.isLoading)

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      // Expects the custom reset-email link (?token_hash=...), with fallbacks
      // for ?token=/?code= providers. See Docs/Implementation_Plan.md.
      token:
        searchParams.get('token_hash') ??
        searchParams.get('token') ??
        searchParams.get('code') ??
        '',
      password: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: ResetPasswordInput) {
    try {
      await resetPassword(values.token, values.password)
      toast.success('Password updated. Please sign in.')
      navigate('/login', { replace: true })
    } catch {
      // error surfaced via store.error
    }
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
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="••••••••" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" />}
                Update password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
