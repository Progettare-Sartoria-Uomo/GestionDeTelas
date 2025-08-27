import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit3 } from 'lucide-react';

interface OrdenCorte {
  id: string;
  numero_lote: string;
  cliente_id: string;
  fecha_creacion: string;
  estado: string;
  notas: string;
  created_at: string;
  clientes?: {
    nombre: string;
  };
}

interface Cliente {
  id: string;
  nombre: string;
}

interface EditOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenCorte;
  onOrderUpdated: () => void;
}

export default function EditOrderDialog({ isOpen, onClose, orden, onOrderUpdated }: EditOrderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [formData, setFormData] = useState({
    numero_lote: '',
    cliente_id: '',
    estado: '',
    notas: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && orden) {
      setFormData({
        numero_lote: orden.numero_lote,
        cliente_id: orden.cliente_id,
        estado: orden.estado,
        notas: orden.notas || ''
      });
      fetchClientes();
    }
  }, [isOpen, orden]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .order('nombre');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('ordenes_corte')
        .update({
          numero_lote: formData.numero_lote,
          cliente_id: formData.cliente_id,
          estado: formData.estado,
          notas: formData.notas || null
        })
        .eq('id', orden.id);

      if (error) throw error;

      toast({
        title: "Orden actualizada",
        description: "Los datos de la orden se han actualizado correctamente.",
      });

      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la orden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar Orden de Corte
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numero_lote">Número de Lote</Label>
            <Input
              id="numero_lote"
              value={formData.numero_lote}
              onChange={(e) => setFormData(prev => ({ ...prev, numero_lote: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select value={formData.cliente_id} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, cliente_id: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select value={formData.estado} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, estado: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Actualizando..." : "Actualizar Orden"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}