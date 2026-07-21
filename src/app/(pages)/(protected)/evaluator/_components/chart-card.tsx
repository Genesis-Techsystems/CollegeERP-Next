'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export function ChartCard({
  title,
  children,
  height = 260,
}: {
  title: string;
  children: ReactNode;
  height?: number;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent style={{ height }}>{children}</CardContent>
    </Card>
  );
}