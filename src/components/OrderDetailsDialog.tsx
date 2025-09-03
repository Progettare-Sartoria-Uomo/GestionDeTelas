import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package2 } from 'lucide-react';

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
    email?: string;
    telefono?: string;
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
    descripcion: string;
  };
}

interface PrendaOrden {
  id: string;
  orden_id: string;
  nombre_prenda: string;
  talles_prenda?: {
    talle: string;
    cantidad: number;
  }[];
}

interface OrderDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenCorte;
}

export default function OrderDetailsDialog({ isOpen, onClose, orden }: OrderDetailsDialogProps) {
  const [detalles, setDetalles] = useState<DetalleOrden[]>([]);
  const [prendas, setPrendas] = useState<PrendaOrden[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orden) {
      fetchDetalles();
      fetchPrendas();
    }
  }, [isOpen, orden]);

  const fetchDetalles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('detalle_ordenes_corte')
        .select(`
          *,
          telas (
            articulo,
            color,
            tipo,
            descripcion
          )
        `)
        .eq('orden_id', orden.id);

      if (error) throw error;
      setDetalles(data || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
      }
  };

  const fetchPrendas = async () => {
    try {
      const { data, error } = await supabase
        .from('prendas_orden')
        .select(`
          *,
          talles_prenda (
            talle,
            cantidad
          )
        `)
        .eq('orden_id', orden.id);

      if (error) throw error;
      setPrendas(data || []);
    } catch (error) {
      console.error('Error fetching prendas:', error);
    }
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'secondary';
      case 'en_proceso': return 'default';
      case 'completado': return 'default';
      default: return 'outline';
    }
  };

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_proceso': return 'En Proceso';
      case 'completado': return 'Completado';
      default: return estado;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Detalles de Orden de Corte - {orden.numero_lote}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información general de la orden */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número de Lote</p>
                <p className="font-medium">{orden.numero_lote}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={getEstadoBadgeVariant(orden.estado)}>
                  {getEstadoText(orden.estado)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{orden.clientes?.nombre || 'Cliente no encontrado'}</p>
                {orden.clientes?.email && (
                  <p className="text-sm text-muted-foreground">{orden.clientes.email}</p>
                )}
                {orden.clientes?.telefono && (
                  <p className="text-sm text-muted-foreground">{orden.clientes.telefono}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-medium">{new Date(orden.fecha_creacion).toLocaleDateString()}</p>
              </div>
              {orden.notas && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="font-medium">{orden.notas}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detalles de telas */}
          <Card>
            <CardHeader>
              <CardTitle>Telas para Corte</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando detalles...</span>
                </div>
              ) : detalles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay telas registradas en esta orden
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artículo</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Metros a Cortar</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalles.map((detalle) => (
                      <TableRow key={detalle.id}>
                        <TableCell className="font-medium">
                          {detalle.telas?.articulo || 'N/A'}
                        </TableCell>
                        <TableCell>{detalle.telas?.color || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {detalle.telas?.tipo || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{detalle.metros_cortar}m</TableCell>
                        <TableCell>
                          {detalle.observaciones || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Prendas y Talles */}
          <Card>
            <CardHeader>
              <CardTitle>Prendas y Talles</CardTitle>
            </CardHeader>
            <CardContent>
              {prendas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay prendas registradas en esta orden
                </div>
              ) : (
                <div className="space-y-4">
                  {prendas.map((prenda) => (
                    <div key={prenda.id} className="border rounded-lg p-4">
                      <h4 className="font-medium text-lg mb-3">{prenda.nombre_prenda}</h4>
                      {prenda.talles_prenda && prenda.talles_prenda.length > 0 ? (
                        <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                          {prenda.talles_prenda
                            .sort((a, b) => Number(a.talle) - Number(b.talle))
                            .map((talle) => (
                            <div key={talle.talle} className="text-center p-2 bg-muted rounded">
                              <div className="font-medium text-sm">{talle.talle}</div>
                              <div className="text-xs text-muted-foreground">{talle.cantidad} pcs</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">Sin talles definidos</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{detalles.length}</p>
                  <p className="text-sm text-muted-foreground">Telas Diferentes</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {detalles.reduce((sum, detalle) => sum + detalle.metros_cortar, 0).toFixed(1)}m
                  </p>
                  <p className="text-sm text-muted-foreground">Total Metros</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{prendas.length}</p>
                  <p className="text-sm text-muted-foreground">Prendas</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {prendas.reduce((sum, prenda) => 
                      sum + (prenda.talles_prenda?.reduce((talleSum, talle) => talleSum + talle.cantidad, 0) || 0)
                    , 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Piezas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}