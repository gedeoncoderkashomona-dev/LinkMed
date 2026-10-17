import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  fase: string;
  detalhes?: string;
}

export function ModulePlaceholder({ title, description, fase, detalhes }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Card className="border-dashed border-border/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Clock className="h-3 w-3" />
              {fase}
            </Badge>
          </div>
          <CardTitle className="pt-2 text-lg">Módulo em Desenvolvimento</CardTitle>
          <CardDescription>
            Este módulo faz parte do escopo planejado e será ativado no ciclo correspondente.
          </CardDescription>
        </CardHeader>
        {detalhes && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{detalhes}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
