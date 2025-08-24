import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit, Trash2, Eye, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Cliente {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  notas?: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteTelas, setClienteTelas] = useState<any[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [selectedClienteNombre, setSelectedClienteNombre] = useState<string>('');
  const [showTelasDialog, setShowTelasDialog] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para la vista de telas del cliente
  const [clienteTelaSearch, setClienteTelaSearch] = useState('');
  const [clienteTelaFilter, setClienteTelaFilter] = useState<'todos' | 'tela' | 'forreria'>('todos');
  const [clienteTelaSort, setClienteTelaSort] = useState<'fecha_desc' | 'fecha_asc' | 'articulo' | 'metros'>('fecha_desc');
  
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    notas: '',
  });

  useEffect(() => {
    fetchClientes();
  }, []);

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
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes.",
        variant: "destructive",
      });
    }
  };

  const fetchClienteTelas = async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('telas')
        .select('*')
        .eq('cliente_id', clienteId)
        .is('deleted_at', null)
        .order('fecha_envio', { ascending: false });

      if (error) throw error;
      setClienteTelas(data || []);
    } catch (error) {
      console.error('Error fetching client telas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las telas del cliente.",
        variant: "destructive",
      });
    }
  };

  // Filtrado y ordenamiento de telas del cliente
  const filteredClienteTelas = clienteTelas
    .filter(tela => {
      const matchesSearch = tela.articulo.toLowerCase().includes(clienteTelaSearch.toLowerCase()) ||
                           tela.color.toLowerCase().includes(clienteTelaSearch.toLowerCase()) ||
                           tela.descripcion.toLowerCase().includes(clienteTelaSearch.toLowerCase());
      
      const matchesFilter = clienteTelaFilter === 'todos' || tela.tipo === clienteTelaFilter;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (clienteTelaSort) {
        case 'fecha_asc':
          return new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime();
        case 'fecha_desc':
          return new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime();
        case 'articulo':
          return a.articulo.localeCompare(b.articulo);
        case 'metros':
          return b.metros - a.metros;
        default:
          return 0;
      }
    });

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      notas: '',
    });
    setEditingClient(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', editingClient.id);

        if (error) throw error;
        
        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se han actualizado correctamente.",
        });
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([formData]);

        if (error) throw error;
        
        toast({
          title: "Cliente agregado",
          description: "El cliente se ha registrado correctamente.",
        });
      }
      
      await fetchClientes();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingClient(cliente);
    setFormData({
      nombre: cliente.nombre,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      notas: cliente.notas || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (clienteId: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId);

      if (error) throw error;
      
      await fetchClientes();
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado del registro.",
      });
    } catch (error) {
      console.error('Error deleting cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente.",
        variant: "destructive",
      });
    }
  };

  const handleViewTelas = async (clienteId: string, clienteNombre: string) => {
    setSelectedClienteId(clienteId);
    setSelectedClienteNombre(clienteNombre);
    await fetchClienteTelas(clienteId);
    setShowTelasDialog(true);
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Clientes</h2>
          <p className="text-muted-foreground">Gestión de clientes registrados</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingClient 
                  ? 'Actualiza los datos del cliente' 
                  : 'Registra un nuevo cliente en el sistema'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre del cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="Número de teléfono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Input
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas adicionales"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : (editingClient ? 'Actualizar' : 'Registrar')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Clientes</CardTitle>
              <CardDescription>
                {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {clientes.length === 0 
                ? 'No hay clientes registrados. Agrega el primer cliente.' 
                : 'No se encontraron clientes con esos criterios de búsqueda.'
              }
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                    <TableHead className="hidden lg:table-cell">Notas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{cliente.nombre}</div>
                          <div className="text-sm text-muted-foreground sm:hidden">
                            {cliente.email || 'Sin email'} • {cliente.telefono || 'Sin teléfono'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{cliente.email || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">{cliente.telefono || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{cliente.notas || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTelas(cliente.id, cliente.nombre)}
                            title="Ver telas del cliente"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(cliente)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cliente.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

        {/* Dialog for viewing client's telas */}
        <Dialog open={showTelasDialog} onOpenChange={setShowTelasDialog}>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">
                Telas de {selectedClienteNombre}
              </DialogTitle>
              <DialogDescription>
                Gestión completa de telas asociadas a este cliente
              </DialogDescription>
            </DialogHeader>
            
            {/* Search and filter controls */}
            <div className="flex flex-col sm:flex-row gap-4 py-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por artículo, color, descripción..."
                  className="pl-8"
                  value={clienteTelaSearch}
                  onChange={(e) => setClienteTelaSearch(e.target.value)}
                />
              </div>
              <Select value={clienteTelaFilter} onValueChange={(value) => setClienteTelaFilter(value as typeof clienteTelaFilter)}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="tela">Solo Telas</SelectItem>
                  <SelectItem value="forreria">Solo Forrería</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clienteTelaSort} onValueChange={(value) => setClienteTelaSort(value as typeof clienteTelaSort)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fecha_desc">Fecha ↓</SelectItem>
                  <SelectItem value="fecha_asc">Fecha ↑</SelectItem>
                  <SelectItem value="articulo">Artículo</SelectItem>
                  <SelectItem value="metros">Metros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredClienteTelas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {clienteTelas.length === 0 
                    ? 'Este cliente no tiene telas registradas.'
                    : 'No se encontraron telas que coincidan con los filtros.'
                  }
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artículo</TableHead>
                        <TableHead className="hidden sm:table-cell">Color</TableHead>
                        <TableHead>Metros</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead className="hidden lg:table-cell">Patrón</TableHead>
                        <TableHead className="hidden lg:table-cell">Descripción</TableHead>
                        <TableHead>Fecha Envío</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClienteTelas.map((tela) => (
                        <TableRow key={tela.id}>
                          <TableCell className="font-medium">
                            <div className="space-y-1">
                              <div>{tela.articulo}</div>
                              <div className="text-xs text-muted-foreground sm:hidden">
                                {tela.color} • {tela.tipo === 'tela' ? 'Tela' : 'Forrería'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{tela.color}</TableCell>
                          <TableCell className="font-semibold">{tela.metros}m</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant={tela.tipo === 'tela' ? 'default' : 'secondary'}>
                              {tela.tipo === 'tela' ? 'Tela' : 'Forrería'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline">
                              {tela.patron === 'lisa' ? 'Lisa' : 'Fantasía'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell max-w-xs truncate" title={tela.descripcion}>
                            {tela.descripcion}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(tela.fecha_envio).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            
            {/* Summary stats */}
            <div className="border-t pt-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{filteredClienteTelas.length}</div>
                  <div className="text-xs text-muted-foreground">Total Registros</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {filteredClienteTelas.reduce((sum, tela) => sum + tela.metros, 0).toFixed(1)}m
                  </div>
                  <div className="text-xs text-muted-foreground">Total Metros</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {filteredClienteTelas.filter(t => t.tipo === 'tela').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Telas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {filteredClienteTelas.filter(t => t.tipo === 'forreria').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Forrería</div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}