import { useState } from 'react'
import { Check, X, Info, Trash2 } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { cn } from '@/lib'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3 overflow-x-auto">
        {children}
      </CardContent>
    </Card>
  )
}

const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const
const sizes = ['default', 'sm', 'lg', 'icon'] as const

export default function ComponentsDemoPage() {
  const [inputValue, setInputValue] = useState('')
  const [selected, setSelected] = useState('apple')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Component Showcase</h1>
        <p className="text-sm text-muted-foreground">
          All shadcn/ui components bundled with Vaultory, rendered on this page.
        </p>
      </div>

      <Section title="Buttons">
        {variants.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
        {sizes.map((s) => (
          <Button key={s} size={s}>
            {s === 'icon' ? <Check className="size-4" /> : s}
          </Button>
        ))}
        <Button disabled>disabled</Button>
      </Section>

      <Section title="Card">
        <Card className="w-72">
          <CardHeader>
            <CardTitle>Inventory Summary</CardTitle>
            <CardDescription>Combined across all three stores</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              1,240 products · 12 low-stock · 3 auto-orders pending
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button>View</Button>
            <Button variant="ghost">Details</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Input & Label">
        <div className="grid w-72 gap-2">
          <Label htmlFor="demo-input">Product SKU</Label>
          <Input
            id="demo-input"
            placeholder="SKU-0001"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input disabled placeholder="disabled" />
        </div>
      </Section>

      <Section title="Select">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pick a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectItem value="cherry">Cherry</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">Selected: {selected}</span>
      </Section>

      <Section title="Badges">
        <Badge>default</Badge>
        <Badge variant="secondary">secondary</Badge>
        <Badge variant="destructive">destructive</Badge>
        <Badge variant="outline">outline</Badge>
        <Badge className="gap-1">
          <Check className="size-3" /> success
        </Badge>
      </Section>

      <Section title="Alerts">
        <div className="grid w-full max-w-md gap-3">
          <Alert>
            <Info className="size-4" />
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>3 products are below their reorder point.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <X className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to place purchase order. Please retry.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Dropdown Menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm auto-order</DialogTitle>
              <DialogDescription>
                Approve the AI-generated purchase order for 42 units across 5 products.
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Review the forecast before approving.
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Approve</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">First tab content.</TabsContent>
          <TabsContent value="tab2">Second tab content.</TabsContent>
          <TabsContent value="tab3">Third tab content.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Table">
        <div className="w-full overflow-x-auto">
          <Table className="w-full max-w-md min-w-[22rem]">
            <TableCaption>Recent sales orders</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">INV-0001</TableCell>
                <TableCell>
                  <Badge variant="secondary">completed</Badge>
                </TableCell>
                <TableCell className="text-right">$120.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">INV-0002</TableCell>
                <TableCell>
                  <Badge className="gap-1">
                    <span className={cn('size-1.5 rounded-full bg-current')} /> pending
                  </Badge>
                </TableCell>
                <TableCell className="text-right">$45.50</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Avatar">
        {['RO', 'LM', 'ST'].map((f) => (
          <Avatar key={f}>
            <AvatarImage src="" alt="" />
            <AvatarFallback>{f}</AvatarFallback>
          </Avatar>
        ))}
      </Section>

      <Section title="Progress & Skeleton">
        <div className="grid w-full max-w-sm gap-4">
          <Progress value={62} />
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Separator">
        <div className="flex h-8 items-center gap-3 text-sm">
          <span>All Stores</span>
          <Separator orientation="vertical" />
          <span>Store 1</span>
          <Separator orientation="vertical" />
          <span>Store 2</span>
        </div>
      </Section>
    </div>
  )
}
