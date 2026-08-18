import Link from "next/link";
import { BarChart3Icon, SettingsIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const moreLinks = [
  {
    title: "Analytics",
    description: "Track performance across connected platforms.",
    href: "/analytics",
    icon: BarChart3Icon,
  },
  {
    title: "Settings",
    description: "Manage profile, accounts, and preferences.",
    href: "/settings",
    icon: SettingsIcon,
  },
];

export default function SettingsHubPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="text-sm text-muted-foreground">
          Analytics, settings, and additional tools.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {moreLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.href} size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-4" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button render={<Link href={item.href} />} nativeButton={false}>
                  Open
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
