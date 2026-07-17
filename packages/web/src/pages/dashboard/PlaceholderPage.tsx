import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            This workspace section is ready for its page content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The sidebar, header, and selected route are connected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
