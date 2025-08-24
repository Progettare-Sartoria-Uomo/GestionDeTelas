-- Create clients table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fabrics table
CREATE TABLE public.telas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  articulo TEXT NOT NULL,
  color TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  metros DECIMAL(10,2) NOT NULL,
  fecha_envio DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('tela', 'forreria')),
  patron TEXT NOT NULL CHECK (patron IN ('lisa', 'fantasia')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telas ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth is implemented)
CREATE POLICY "Allow all operations on clientes" 
ON public.clientes 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on telas" 
ON public.telas 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telas_updated_at
  BEFORE UPDATE ON public.telas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_telas_cliente_id ON public.telas(cliente_id);
CREATE INDEX idx_telas_fecha_envio ON public.telas(fecha_envio);
CREATE INDEX idx_telas_tipo ON public.telas(tipo);