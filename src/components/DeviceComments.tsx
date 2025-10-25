import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
}

interface DeviceCommentsProps {
  deviceId: string;
}

export function DeviceComments({ deviceId }: DeviceCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      user: 'Олександр',
      text: 'Температура трохи висока, потрібно збільшити вентиляцію',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      user: 'Система',
      text: 'Автоматичне сповіщення: Вологість ґрунту нижче оптимального рівня',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
  ]);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: user?.email?.split('@')[0] || 'Користувач',
      text: newComment,
      timestamp: new Date(),
    };

    setComments([comment, ...comments]);
    setNewComment('');
    
    toast({
      title: 'Коментар додано',
      description: 'Ваш коментар успішно збережено',
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'щойно';
    if (diffMins < 60) return `${diffMins} хв тому`;
    if (diffHours < 24) return `${diffHours} год тому`;
    
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Коментарі
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <div className="space-y-2">
          <Textarea
            placeholder="Додайте коментар про стан пристрою..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] bg-muted/30"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Надіслати
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Поки немає коментарів</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {comment.user.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{comment.user}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(comment.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
