import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, PackagePlus, Sparkles } from 'lucide-react'
import { z } from 'zod'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { signInSchema, signUpSchema, type SignInInput } from '@/lib/schemas'
import { useStores } from '@/hooks'
import { useAuthStore } from '@/stores'

type Mode = 'signin' | 'signup'

const signUpFormSchema = signUpSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type SignUpFormInput = z.infer<typeof signUpFormSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const authLoading = useAuthStore((s) => s.isLoading)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const signInForm = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  const signUpForm = useForm<SignUpFormInput>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { email: '', password: '', fullName: '', confirmPassword: '', storeId: '' },
  })

  const { data: storesData } = useStores()
  const stores = storesData?.stores ?? []

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function onSubmitSignIn(values: SignInInput) {
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

  async function onSubmitSignUp({ confirmPassword: _confirm, ...payload }: SignUpFormInput) {
    setSubmitting(true)
    try {
      await signUp(payload)
      toast.success('Account created — sign in to continue')
      setMode('signin')
      signUpForm.reset()
      signInForm.reset()
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
          <CardTitle>{mode === 'signin' ? 'Sign in' : 'Create account'}</CardTitle>
          <CardDescription>
            {mode === 'signin'
              ? 'Enter your credentials to access the dashboard.'
              : 'Self-service store staff accounts. Pick your store — access is limited to it.'}
          </CardDescription>
        </CardHeader>

        {mode === 'signin' ? (
          <>
            <CardContent>
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(onSubmitSignIn)} className="grid gap-4">
                  <FormField
                    control={signInForm.control}
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
                    control={signInForm.control}
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
            <CardFooter className="flex-col items-stretch gap-3 text-sm">
              <div className="flex justify-between">
                <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
                  Forgot password?
                </Link>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode('signup')}>
                <PackagePlus className="size-4 mr-1.5" />
                New here? Create an account
              </Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardContent>
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(onSubmitSignUp)} className="grid gap-4">
                  <FormField
                    control={signUpForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" autoComplete="name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
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
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Minimum 8 characters"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store</FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(v) => field.onChange(v === '' ? undefined : v)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your store" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(stores ?? []).map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your access will be limited to this store.
                  </p>
                  <Button type="submit" disabled={authLoading || submitting}>
                    {(authLoading || submitting) && <Loader2 className="animate-spin" />}
                    Create account
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="justify-center text-sm">
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => setMode('signin')}
                className="text-muted-foreground hover:text-foreground"
              >
                Already have an account? Sign in
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}