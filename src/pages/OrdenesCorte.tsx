import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Package, Eye, Edit, Trash2 } from 'lucide-react';
import OrderDetailsDialog from '@/components/OrderDetailsDialog';
import EditOrderDialog from '@/components/EditOrderDialog';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
}

interface Tela {
  id: string;
  articulo: string;
  descripcion: string;
  color: string;
  patron: string;
  tipo: string;
  metros: number;
  fecha_envio: string;
  cliente_id: string;
}

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

interface DetalleOrden {
  id: string;
  orden_id: string;
  tela_id: string;
  metros_cortar: number;
  observaciones: string;
  telas?: {
    articulo: string;
    color: string;
    tipo: string;
  }
}

export default function OrdenesCorte() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [telas, setTelas] = useState<Tela[]>([]);
  const [ordenes, setOrdenes] = useState<(OrdenCorte & { cliente_nombre: string })[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [telasCliente, setTelasCliente] = useState<Tela[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
    
  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<OrdenCorte | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Formulario nueva orden
  const [numeroLote, setNumeroLote] = useState('');
  const [notasOrden, setNotasOrden] = useState('');
  const [telasSeleccionadas, setTelasSeleccionadas] = useState<{tela_id: string, metros: number, observaciones: string}[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
    fetchOrdenes();
  }, []);

  useEffect(() => {
    if (clienteSeleccionado) {
      fetchTelasCliente(clienteSeleccionado);
    }
  }, [clienteSeleccionado]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre');
      
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const fetchTelasCliente = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('telas')
        .select('*')
        .eq('cliente_id', clienteId)
        .is('deleted_at', null)
        .order('fecha_envio', { ascending: false });
      
      if (error) throw error;
      setTelasCliente(data || []);
    } catch (error) {
      console.error('Error fetching telas:', error);
    }
  };

  const fetchOrdenes = async () => {
    try {
      const { data, error } = await supabase
        .from('ordenes_corte')
        .select(`
          *,
          clientes (
            nombre
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const ordenesConCliente = (data || []).map(orden => ({
        ...orden,
        cliente_nombre: orden.clientes?.nombre || 'Cliente no encontrado'
      }));
      
      setOrdenes(ordenesConCliente);
    } catch (error) {
      console.error('Error fetching ordenes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las órdenes de corte.",
        variant: "destructive",
      });
    }
  };

  const generarNumeroLote = () => {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `OC${año}${mes}${dia}${random}`;
  };

  const agregarTelaAOrden = (tela: Tela) => {
    const yaSeleccionada = telasSeleccionadas.find(t => t.tela_id === tela.id);
    if (yaSeleccionada) {
      toast({
        title: "Tela ya seleccionada",
        description: "Esta tela ya está en la orden de corte.",
        variant: "destructive",
      });
      return;
    }

    setTelasSeleccionadas([...telasSeleccionadas, {
      tela_id: tela.id,
      metros: 1,
      observaciones: ''
    }]);
  };

  const actualizarMetrosTela = (telaId: string, metros: number) => {
    setTelasSeleccionadas(prev => 
      prev.map(t => t.tela_id === telaId ? { ...t, metros } : t)
    );
  };

  const actualizarObservacionesTela = (telaId: string, observaciones: string) => {
    setTelasSeleccionadas(prev => 
      prev.map(t => t.tela_id === telaId ? { ...t, observaciones } : t)
    );
  };

  const removerTelaDeOrden = (telaId: string) => {
    setTelasSeleccionadas(prev => prev.filter(t => t.tela_id !== telaId));
  };

  const limpiarFormulario = () => {
    setClienteSeleccionado('');
    setTelasCliente([]);
    setNumeroLote('');
    setNotasOrden('');
    setTelasSeleccionadas([]);
  };

  const crearOrden = async () => {
    if (!clienteSeleccionado || !numeroLote || telasSeleccionadas.length === 0) {
      toast({
        title: "Datos incompletos",
        description: "Debe seleccionar un cliente, generar número de lote y agregar al menos una tela.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      // Crear la orden principal
      const { data: orden, error: ordenError } = await supabase
        .from('ordenes_corte')
        .insert({
          numero_lote: numeroLote,
          cliente_id: clienteSeleccionado,
          estado: 'pendiente',
          notas: notasOrden || null
        })
        .select()
        .single();

      if (ordenError) throw ordenError;

      // Crear los detalles de la orden
      const detalles = telasSeleccionadas.map(tela => ({
        orden_id: orden.id,
        tela_id: tela.tela_id,
        metros_cortar: tela.metros,
        observaciones: tela.observaciones || null
      }));

      const { error: detallesError } = await supabase
        .from('detalle_ordenes_corte')
        .insert(detalles);

      if (detallesError) throw detallesError;

      toast({
        title: "Orden creada exitosamente",
        description: `Orden de corte ${numeroLote} creada con ${telasSeleccionadas.length} tela(s).`,
      });
      
      setIsDialogOpen(false);
      limpiarFormulario();
      await fetchOrdenes(); // Refrescar la lista de órdenes
    } catch (error) {
      console.error('Error creating orden:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la orden de corte. Intente nuevamente.",
        variant: "destructive",
      });
      } finally {
      setLoading(false);
    }
    };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    
    setDeleteLoading(true);
    try {
      // First delete order details
      const { error: detallesError } = await supabase
        .from('detalle_ordenes_corte')
        .delete()
        .eq('orden_id', selectedOrder.id);

      if (detallesError) throw detallesError;

      // Then delete the order
      const { error: ordenError } = await supabase
        .from('ordenes_corte')
        .delete()
        .eq('id', selectedOrder.id);

      if (ordenError) throw ordenError;

      toast({
        title: "Orden eliminada",
        description: "La orden de corte ha sido eliminada correctamente.",
      });

      setIsDeleteDialogOpen(false);
      setSelectedOrder(null);
      await fetchOrdenes();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la orden de corte.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDetailsDialog = (orden: OrdenCorte) => {
    setSelectedOrder(orden);
    setIsDetailsDialogOpen(true);
  };

  const openEditDialog = (orden: OrdenCorte) => {
    setSelectedOrder(orden);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (orden: OrdenCorte) => {
    setSelectedOrder(orden);
    setIsDeleteDialogOpen(true);
  };

  const filteredOrdenes = ordenes.filter(orden => 
    orden.numero_lote.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTelaNombre = (telaId: string) => {
    const tela = telasCliente.find(t => t.id === telaId);
    return tela ? `${tela.articulo} - ${tela.color}` : 'Tela no encontrada';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Órdenes de Corte</h1>
          <p className="text-muted-foreground">Gestiona las órdenes de corte de telas para clientes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setNumeroLote(generarNumeroLote())}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Orden de Corte</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
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

                <div>
                  <Label htmlFor="numero-lote">Número de Lote</Label>
                  <div className="flex gap-2">
                    <Input
                      id="numero-lote"
                      value={numeroLote}
                      onChange={(e) => setNumeroLote(e.target.value)}
                      placeholder="Número de lote"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNumeroLote(generarNumeroLote())}
                    >
                      Generar
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notas">Notas de la Orden</Label>
                  <Textarea
                    id="notas"
                    value={notasOrden}
                    onChange={(e) => setNotasOrden(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Telas Disponibles del Cliente</Label>
                  {clienteSeleccionado ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                      {telasCliente.length > 0 ? (
                        telasCliente.map((tela) => (
                          <div key={tela.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1">
                              <p className="font-medium">{tela.articulo}</p>
                              <p className="text-sm text-muted-foreground">
                                {tela.color} - {tela.tipo} - {tela.metros}m
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => agregarTelaAOrden(tela)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          No hay telas disponibles para este cliente
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Selecciona un cliente para ver sus telas</p>
                  )}
                </div>
              </div>
            </div>

            {telasSeleccionadas.length > 0 && (
              <div className="mt-6">
                <Label>Telas Seleccionadas para Corte</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  {telasSeleccionadas.map((telaSeleccionada) => (
                    <div key={telaSeleccionada.tela_id} className="flex items-center gap-2 p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{getTelaNombre(telaSeleccionada.tela_id)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={telaSeleccionada.metros}
                          onChange={(e) => actualizarMetrosTela(telaSeleccionada.tela_id, Number(e.target.value))}
                          className="w-20"
                          min="0.1"
                          step="0.1"
                        />
                        <span className="text-sm">m</span>
                        <Input
                          placeholder="Observaciones..."
                          value={telaSeleccionada.observaciones}
                          onChange={(e) => actualizarObservacionesTela(telaSeleccionada.tela_id, e.target.value)}
                          className="w-32"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removerTelaDeOrden(telaSeleccionada.tela_id)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={crearOrden} disabled={loading}>
                {loading ? "Creando..." : "Crear Orden"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lista de Órdenes</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrdenes.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No hay órdenes de corte</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primera orden de corte para comenzar
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Orden
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Lote</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdenes.map((orden) => (
                  <TableRow key={orden.id}>
                    <TableCell className="font-medium">{orden.numero_lote}</TableCell>
                    <TableCell>{orden.clientes?.nombre || 'Cliente no encontrado'}</TableCell>
                    <TableCell>{new Date(orden.fecha_creacion).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={orden.estado === 'pendiente' ? 'secondary' : orden.estado === 'en_proceso' ? 'default' : 'outline'}>
                        {orden.estado === 'pendiente' ? 'Pendiente' : orden.estado === 'en_proceso' ? 'En Proceso' : orden.estado === 'completado' ? 'Completado' : orden.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openDetailsDialog(orden)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(orden)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openDeleteDialog(orden)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedOrder && (
        <>
          <OrderDetailsDialog
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            orden={selectedOrder}
          />
          <EditOrderDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            orden={selectedOrder}
            onOrderUpdated={fetchOrdenes}
          />
        </>
      )}
      
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteOrder}
        title="¿Eliminar orden de corte?"
        description={`¿Estás seguro de que deseas eliminar la orden ${selectedOrder?.numero_lote}? Esta acción no se puede deshacer y eliminará también todos los detalles asociados.`}
        isLoading={deleteLoading}
      />
    </div>
  );
}