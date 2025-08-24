import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RotateCcw, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TelaEliminada {
  id: string;
  articulo: string;
  color: string;
  descripcion: string;
  tipo: string;
  patron: string;
  metros: number;
  fecha_envio: string;
  cliente_id?: string;
  deleted_at: string;
  clientes?: {
    id: string;
    nombre: string;
  };
}

export default function Eliminados() {
  const [telasEliminadas, setTelasEliminadas] = useState<TelaEliminada[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTelasEliminadas();
  }, []);

  const fetchTelasEliminadas = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('telas')
        .select(`
          *,
          clientes (
            id,
            nombre
          )
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      setTelasEliminadas(data || []);
    } catch (error) {
      console.error('Error fetching deleted telas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las telas eliminadas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (telaId: string) => {
    try {
      const { error } = await supabase
        .from('telas')
        .update({ deleted_at: null })
        .eq('id', telaId);

      if (error) throw error;

      await fetchTelasEliminadas();
      toast({
        title: "Tela restaurada",
        description: "La tela ha sido restaurada correctamente.",
      });
    } catch (error) {
      console.error('Error restoring tela:', error);
      toast({
        title: "Error",
        description: "No se pudo restaurar la tela.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async (telaId: string) => {
    try {
      const { error } = await supabase
        .from('telas')
        .delete()
        .eq('id', telaId);

      if (error) throw error;

      await fetchTelasEliminadas();
      toast({
        title: "Tela eliminada permanentemente",
        description: "La tela ha sido eliminada de forma permanente.",
      });
    } catch (error) {
      console.error('Error permanently deleting tela:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tela permanentemente.",
        variant: "destructive",
      });
    }
  };

  const filteredTelas = telasEliminadas.filter(tela =>
    tela.articulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tela.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tela.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tela.clientes?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Eliminados</h2>
          <p className="text-muted-foreground">Papelera de reciclaje - telas eliminadas</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Telas Eliminadas</CardTitle>
              <CardDescription>
                {telasEliminadas.length} tela{telasEliminadas.length !== 1 ? 's' : ''} eliminada{telasEliminadas.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar telas eliminadas..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredTelas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {telasEliminadas.length === 0 
                ? 'No hay telas eliminadas.' 
                : 'No se encontraron telas con esos criterios de búsqueda.'
              }
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artículo</TableHead>
                    <TableHead className="hidden sm:table-cell">Color</TableHead>
                    <TableHead className="hidden md:table-cell">Metros</TableHead>
                    <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                    <TableHead className="hidden lg:table-cell">Eliminado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTelas.map((tela) => (
                    <TableRow key={tela.id}>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{tela.articulo}</div>
                          <div className="text-sm text-muted-foreground sm:hidden">
                            {tela.color} • {tela.metros}m
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{tela.color}</TableCell>
                      <TableCell className="hidden md:table-cell">{tela.metros}m</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {tela.clientes?.nombre || 'Sin cliente'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(tela.deleted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(tela.id)}
                            title="Restaurar tela"
                            className="text-primary hover:text-primary"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Eliminar permanentemente"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción eliminará permanentemente la tela "{tela.articulo}". 
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handlePermanentDelete(tela.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar permanentemente
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}