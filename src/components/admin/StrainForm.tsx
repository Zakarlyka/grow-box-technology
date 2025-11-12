import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface StrainFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strain?: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    thc_content: string | null;
    cbd_content: string | null;
    flowering_time: string | null;
    yield_info: string | null;
    difficulty: string | null;
    effects: string[] | null;
  } | null;
  onSuccess: () => void;
}

export function StrainForm({ open, onOpenChange, strain, onSuccess }: StrainFormProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('photoperiod');
  const [description, setDescription] = useState('');
  const [thcContent, setThcContent] = useState('');
  const [cbdContent, setCbdContent] = useState('');
  const [floweringTime, setFloweringTime] = useState('');
  const [yieldInfo, setYieldInfo] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [effects, setEffects] = useState('');

  useEffect(() => {
    if (strain) {
      setName(strain.name);
      setType(strain.type);
      setDescription(strain.description || '');
      setThcContent(strain.thc_content || '');
      setCbdContent(strain.cbd_content || '');
      setFloweringTime(strain.flowering_time || '');
      setYieldInfo(strain.yield_info || '');
      setDifficulty(strain.difficulty || '');
      setEffects(strain.effects?.join(', ') || '');
    } else {
      setName('');
      setType('photoperiod');
      setDescription('');
      setThcContent('');
      setCbdContent('');
      setFloweringTime('');
      setYieldInfo('');
      setDifficulty('');
      setEffects('');
    }
  }, [strain, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const effectsArray = effects.split(',').map(e => e.trim()).filter(Boolean);

      const data = {
        name,
        type,
        description: description.trim() || null,
        thc_content: thcContent.trim() || null,
        cbd_content: cbdContent.trim() || null,
        flowering_time: floweringTime.trim() || null,
        yield_info: yieldInfo.trim() || null,
        difficulty: difficulty.trim() || null,
        effects: effectsArray.length > 0 ? effectsArray : null,
      };

      if (strain) {
        // Оновлення
        const { error } = await supabase
          .from('strains')
          .update(data)
          .eq('id', strain.id);

        if (error) throw error;

        toast({
          title: 'Успіх',
          description: 'Сорт оновлено',
        });
      } else {
        // Створення
        const { error } = await supabase
          .from('strains')
          .insert(data);

        if (error) throw error;

        toast({
          title: 'Успіх',
          description: 'Сорт додано',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Помилка',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {strain ? 'Редагувати Сорт' : 'Додати Сорт'}
          </DialogTitle>
          <DialogDescription>
            Заповніть інформацію про сорт для "Помічника"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Northern Lights"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Тип *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="autoflower">Autoflower</SelectItem>
                <SelectItem value="photoperiod">Photoperiod</SelectItem>
                <SelectItem value="clone">Clone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опис сорту..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thc_content">THC %</Label>
            <Input
              id="thc_content"
              value={thcContent}
              onChange={(e) => setThcContent(e.target.value)}
              placeholder="15-20%"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cbd_content">CBD %</Label>
            <Input
              id="cbd_content"
              value={cbdContent}
              onChange={(e) => setCbdContent(e.target.value)}
              placeholder="< 1%"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="flowering_time">Час цвітіння</Label>
            <Input
              id="flowering_time"
              value={floweringTime}
              onChange={(e) => setFloweringTime(e.target.value)}
              placeholder="8-9 тижнів"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yield_info">Інформація про урожай</Label>
            <Textarea
              id="yield_info"
              value={yieldInfo}
              onChange={(e) => setYieldInfo(e.target.value)}
              placeholder="400-500 г/м² indoor"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Складність</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Виберіть складність" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Легко</SelectItem>
                <SelectItem value="medium">Середньо</SelectItem>
                <SelectItem value="hard">Складно</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effects">Ефекти (через кому)</Label>
            <Input
              id="effects"
              value={effects}
              onChange={(e) => setEffects(e.target.value)}
              placeholder="relaxing, euphoric, creative"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Збереження...' : strain ? 'Оновити' : 'Додати'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
