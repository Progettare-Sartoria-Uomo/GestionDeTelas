import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, Calendar } from "lucide-react";
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Tela {
  id: string;
  articulo: string;
  color: string;
  metros: number;
  fecha_envio: string;
  cliente_id?: string;
}

interface Cliente {
  id: string;
  nombre: string;
}

interface TelasConCliente extends Tela {
  clientes?: Cliente;
}

export default function Dashboard() {
  const [totalClientes, setTotalClientes] = useState<number>(0);
  const [totalTelas, setTotalTelas] = useState<number>(0);
  const [enviosRecientes, setEnviosRecientes] = useState<TelasConCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Contar clientes
      const { count: clientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
      
      // Contar telas activas (no eliminadas)
      const { count: telasCount } = await supabase
        .from('telas')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      
      // Obtener envíos recientes
      const { data: envios } = await supabase
        .from('telas')
        .select(`
          *,
          clientes (
            id,
            nombre
          )
        `)
        .is('deleted_at', null)
        .order('fecha_envio', { ascending: false })
        .limit(5);
      
      setTotalClientes(clientesCount || 0);
      setTotalTelas(telasCount || 0);
      setEnviosRecientes(envios || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Resumen de gestión de telas y clientes</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : totalClientes}</div>
            <p className="text-xs text-muted-foreground">Clientes registrados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Telas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : totalTelas}</div>
            <p className="text-xs text-muted-foreground">Telas en inventario</p>
          </CardContent>
        </Card>
        
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Últimos Envíos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : enviosRecientes.length}</div>
            <p className="text-xs text-muted-foreground">Envíos recientes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Envíos Recientes</CardTitle>
            <CardDescription>Últimas 5 telas enviadas a clientes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Cargando...</div>
            ) : enviosRecientes.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">No hay envíos registrados aún</div>
            ) : (
              <div className="space-y-3">
                {enviosRecientes.map((tela) => (
                  <div key={tela.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">{tela.articulo}</div>
                      <div className="text-sm text-muted-foreground">
                        {tela.color} • {tela.metros}m • {tela.clientes?.nombre || 'Sin cliente'}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground shrink-0">
                      {new Date(tela.fecha_envio).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}