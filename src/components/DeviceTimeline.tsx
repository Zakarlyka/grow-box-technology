import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Activity, Droplets, Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  timestamp: Date;
  icon: any;
}

interface DeviceTimelineProps {
  deviceId: string;
}

export function DeviceTimeline({ deviceId }: DeviceTimelineProps) {
  const events: TimelineEvent[] = [
    {
      id: '1',
      type: 'success',
      title: 'Полив завершено',
      description: 'Водна помпа працювала 30 секунд',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      icon: Droplets,
    },
    {
      id: '2',
      type: 'info',
      title: 'Освітлення увімкнено',
      description: 'Початок світлового дня (16 годин)',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: Lightbulb,
    },
    {
      id: '3',
      type: 'warning',
      title: 'Висока температура',
      description: 'Температура досягла 28°C. Збільшено вентиляцію',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      icon: AlertTriangle,
    },
    {
      id: '4',
      type: 'success',
      title: 'Пристрій онлайн',
      description: 'GrowBox підключився до мережі',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      icon: CheckCircle,
    },
    {
      id: '5',
      type: 'info',
      title: 'Оновлення налаштувань',
      description: 'Змінено розклад освітлення на 16/8 годин',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      icon: Activity,
    },
  ];

  const getVariantColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 border-success/30 text-success';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500';
      case 'error':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      default:
        return 'bg-primary/10 border-primary/30 text-primary';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'щойно';
    if (diffMins < 60) return `${diffMins} хв тому`;
    if (diffHours < 24) return `${diffHours} год тому`;
    if (diffDays === 1) return 'вчора';
    if (diffDays < 7) return `${diffDays} днів тому`;
    
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Таймлайн подій
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 max-h-[500px] overflow-y-auto">
          {/* Timeline Line */}
          <div className="absolute left-[23px] top-2 bottom-2 w-px bg-border" />
          
          {events.map((event, index) => {
            const Icon = event.icon;
            return (
              <div key={event.id} className="relative flex gap-4">
                {/* Timeline Icon */}
                <div
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${getVariantColor(
                    event.type
                  )}`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Event Content */}
                <div className="flex-1 space-y-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium text-sm leading-none">
                        {event.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-xs border-border/50"
                    >
                      {formatTime(event.timestamp)}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
