import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Sparkles } from 'lucide-react'
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
  PasswordInput,
} from '@/components/ui'
import { signInSchema, type SignInInput } from '@/lib/schemas'
import { useAuthStore } from '@/stores'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)
  const authLoading = useAuthStore((s) => s.isLoading)
  const [submitting, setSubmitting] = useState(false)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(values: SignInInput) {
    setSubmitting(true)
    try {
      await signIn(values)
      toast.success('Signed in successfully')
      navigate(from, { replace: true })
    } catch {
      // error surfaced via store.error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <div className="flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-6" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Vaultory</h1>
          <p className="text-sm text-muted-foreground">Retail inventory intelligence</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
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
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={authLoading || submitting}>
                {(authLoading || submitting) && <Loader2 className="animate-spin" />}
                Sign in
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-between text-sm">
          <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
