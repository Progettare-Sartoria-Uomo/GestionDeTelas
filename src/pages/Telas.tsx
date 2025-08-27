import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Filter, Eye, Upload } from 'lucide-react';
import ImageViewer from '@/components/ImageViewer';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
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

interface Cliente {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
}

interface Tela {
  id: string;
  articulo: string;
  color: string;
  descripcion: string;
  metros: number;
  fecha_envio: string;
  tipo: 'tela' | 'forreria';
  patron: 'lisa' | 'fantasia';
  cliente_id?: string;
  created_at: string;
  imagen_url?: string;
  clientes?: Cliente;
}

export default function Telas() {
  const [telas, setTelas] = useState<Tela[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'tela' | 'forreria'>('todos');
  const [sortByDate, setSortByDate] = useState<'reciente' | 'antiguo'>('reciente');
  const [editingTela, setEditingTela] = useState<Tela | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tela | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    articulo: '',
    color: '',
    descripcion: '',
    metros: '',
    fechaEnvio: '',
    tipo: 'tela' as 'tela' | 'forreria',
    patron: 'lisa' as 'lisa' | 'fantasia',
    cliente_id: '',
    nuevoCliente: '',
  });

  useEffect(() => {
    fetchTelas();
    fetchClientes();
  }, []);

  const fetchTelas = async () => {
    try {
      const { data, error } = await supabase
        .from('telas')
        .select(`
          *,
          clientes (
            id,
            nombre,
            telefono,
            email
          )
        `)
        .is('deleted_at', null)
        .order('fecha_envio', { ascending: false });

      if (error) throw error;
      setTelas((data || []) as Tela[]);
    } catch (error) {
      console.error('Error fetching telas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las telas.",
        variant: "destructive",
      });
    }
  };

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

  const resetForm = () => {
    setFormData({
      articulo: '',
      color: '',
      descripcion: '',
      metros: '',
      fechaEnvio: '',
      tipo: 'tela',
      patron: 'lisa',
      cliente_id: '',
      nuevoCliente: '',
    });
    setEditingTela(null);
    setImageFile(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('fabric-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('fabric-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      let clienteId = formData.cliente_id;
      let imagenUrl = editingTela?.imagen_url || null;
      
      // Upload image if selected
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imagenUrl = uploadedUrl;
        }
      }
      
      // Create new client if needed
      if (formData.nuevoCliente.trim() && !formData.cliente_id) {
        const { data: nuevoCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert([{ nombre: formData.nuevoCliente.trim() }])
          .select()
          .single();

        if (clienteError) throw clienteError;
        clienteId = nuevoCliente.id;
        await fetchClientes(); // Refresh clients list
      }

      const telaData = {
        articulo: formData.articulo,
        color: formData.color,
        descripcion: formData.descripcion,
        metros: parseFloat(formData.metros),
        fecha_envio: formData.fechaEnvio,
        tipo: formData.tipo,
        patron: formData.patron,
        cliente_id: clienteId && clienteId !== 'none' ? clienteId : null,
        imagen_url: imagenUrl,
      };

      if (editingTela) {
        const { error } = await supabase
          .from('telas')
          .update(telaData)
          .eq('id', editingTela.id);

        if (error) throw error;
        
        toast({
          title: "Tela actualizada",
          description: "Los datos de la tela se han actualizado correctamente.",
        });
      } else {
        const { error } = await supabase
          .from('telas')
          .insert([telaData]);

        if (error) throw error;
        
        toast({
          title: "Tela agregada",
          description: "La tela se ha registrado correctamente.",
        });
      }
      
      await fetchTelas();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving tela:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la tela.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (tela: Tela) => {
    setEditingTela(tela);
    setFormData({
      articulo: tela.articulo,
      color: tela.color,
      descripcion: tela.descripcion,
      metros: tela.metros.toString(),
      fechaEnvio: tela.fecha_envio,
      tipo: tela.tipo,
      patron: tela.patron,
      cliente_id: tela.cliente_id || 'none',
      nuevoCliente: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('telas')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteTarget.id);

      if (error) throw error;
      
      await fetchTelas();
      toast({
        title: "Tela eliminada",
        description: "La tela ha sido movida a la papelera.",
      });
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting tela:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tela.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const viewImage = (imageUrl: string, title: string) => {
    setSelectedImage(imageUrl);
    setImageViewerOpen(true);
  };

  const filteredTelas = telas.filter(tela => {
    const matchesSearch = tela.articulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tela.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tela.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tela.clientes?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesFilter = filterTipo === 'todos' || tela.tipo === filterTipo;
    
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (sortByDate === 'reciente') {
      return new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime();
    } else {
      return new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime();
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Inventario de Telas</h2>
          <p className="text-muted-foreground">Gestión de telas y forrerías</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Tela
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>
                {editingTela ? 'Editar Tela' : 'Nueva Tela'}
              </DialogTitle>
              <DialogDescription>
                {editingTela 
                  ? 'Actualiza los datos de la tela' 
                  : 'Registra una nueva tela en el inventario'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="articulo">Artículo</Label>
                  <Input
                    id="articulo"
                    value={formData.articulo}
                    onChange={(e) => setFormData(prev => ({ ...prev, articulo: e.target.value }))}
                    placeholder="Código del artículo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="Color de la tela"
                    required
                  />
                </div>
               </div>

               <div className="space-y-2">
                 <Label htmlFor="imagen">Imagen de la Tela</Label>
                 <div className="flex items-center gap-2">
                   <Input
                     id="imagen"
                     type="file"
                     accept="image/*"
                     onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                     className="flex-1"
                   />
                   <Upload className="h-4 w-4 text-muted-foreground" />
                 </div>
                 {editingTela?.imagen_url && !imageFile && (
                   <div className="text-sm text-muted-foreground">
                     Imagen actual disponible
                   </div>
                 )}
               </div>
               
               <div className="space-y-2">
                 <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Descripción detallada de la tela"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="metros">Metros</Label>
                <Input
                  id="metros"
                  type="number"
                  step="0.1"
                  value={formData.metros}
                  onChange={(e) => setFormData(prev => ({ ...prev, metros: e.target.value }))}
                  placeholder="Cantidad en metros"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(value: 'tela' | 'forreria') => 
                    setFormData(prev => ({ ...prev, tipo: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tela">Tela</SelectItem>
                      <SelectItem value="forreria">Forrería</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patron">Patrón</Label>
                  <Select value={formData.patron} onValueChange={(value: 'lisa' | 'fantasia') => 
                    setFormData(prev => ({ ...prev, patron: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar patrón" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lisa">Lisa</SelectItem>
                      <SelectItem value="fantasia">Fantasía</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaEnvio">Fecha de Envío</Label>
                  <Input
                    id="fechaEnvio"
                    type="date"
                    value={formData.fechaEnvio}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaEnvio: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select value={formData.cliente_id} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, cliente_id: value, nuevoCliente: '' }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente existente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin cliente</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm text-muted-foreground">o crear nuevo:</div>
                  <Input
                    id="nuevoCliente"
                    value={formData.nuevoCliente}
                    onChange={(e) => setFormData(prev => ({ ...prev, nuevoCliente: e.target.value, cliente_id: '' }))}
                    placeholder="Nombre del nuevo cliente"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Guardando...' : (editingTela ? 'Actualizar' : 'Registrar')}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Inventario de Telas</CardTitle>
              <CardDescription>
                {telas.length} tela{telas.length !== 1 ? 's' : ''} registrada{telas.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:w-64 sm:flex-none">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar telas..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterTipo} onValueChange={(value: 'todos' | 'tela' | 'forreria') => setFilterTipo(value)}>
                <SelectTrigger className="w-full sm:w-36">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="tela">Tela</SelectItem>
                  <SelectItem value="forreria">Forrería</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortByDate} onValueChange={(value: 'reciente' | 'antiguo') => setSortByDate(value)}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reciente">Más reciente</SelectItem>
                  <SelectItem value="antiguo">Más antiguo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTelas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {telas.length === 0 
                ? 'No hay telas registradas. Agrega la primera tela.' 
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
                     <TableHead>Metros</TableHead>
                     <TableHead className="hidden md:table-cell">Tipo</TableHead>
                     <TableHead className="hidden lg:table-cell">Patrón</TableHead>
                     <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                     <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                     <TableHead className="hidden xl:table-cell">Imagen</TableHead>
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
                            {tela.color} • {tela.metros}m • {tela.tipo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{tela.color}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{tela.metros}m</span>
                          <span className="text-xs text-muted-foreground lg:hidden truncate max-w-[100px]">
                            {tela.descripcion}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={tela.tipo === 'tela' ? 'default' : 'secondary'} className="text-xs">
                          {tela.tipo === 'tela' ? 'Tela' : 'Forrería'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {tela.patron === 'lisa' ? 'Lisa' : 'Fantasía'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{tela.clientes?.nombre || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                         {new Date(tela.fecha_envio).toLocaleDateString()}
                       </TableCell>
                       <TableCell className="hidden xl:table-cell">
                         {tela.imagen_url ? (
                           <div className="w-12 h-12 bg-muted rounded-md overflow-hidden">
                             <img 
                               src={tela.imagen_url} 
                               alt={tela.articulo}
                               className="w-full h-full object-cover"
                             />
                           </div>
                         ) : (
                           <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                             <Upload className="h-4 w-4 text-muted-foreground" />
                           </div>
                         )}
                       </TableCell>
                       <TableCell className="text-right">
                         <div className="flex justify-end gap-1">
                           {tela.imagen_url && (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => viewImage(tela.imagen_url!, `${tela.articulo} - ${tela.color}`)}
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                           )}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleEdit(tela)}
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => setDeleteTarget(tela)}
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

      {/* Image Viewer Dialog */}
      <ImageViewer
        isOpen={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={selectedImage}
        title="Imagen de Tela"
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="¿Eliminar tela?"
        description={`¿Estás seguro de que deseas eliminar la tela ${deleteTarget?.articulo}? Esta acción moverá la tela a la papelera.`}
        isLoading={deleteLoading}
      />
    </div>
  );
}