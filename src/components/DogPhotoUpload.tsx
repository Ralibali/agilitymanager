import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  dogId: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function DogPhotoUpload({ dogId, currentUrl, onUploaded, size = 'lg' }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sizeMap = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5 MB');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Inte inloggad');

      const ext = file.name.split('.').pop();
      // Storage RLS kräver att första mappen = användarens UID
      const path = `${user.id}/${dogId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('dog-photos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('dog-photos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.from('dogs').update({ photo_url: publicUrl }).eq('id', dogId);
      if (updateError) throw updateError;

      onUploaded(publicUrl);
      toast.success('Foto uppladdat!');
    } catch (err: any) {
      toast.error('Kunde inte ladda upp foto');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`${sizeMap[size]} rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer group`}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Hund" className={`${sizeMap[size]} rounded-full object-cover`} />
        ) : uploading ? (
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        ) : (
          <Camera size={20} className="text-muted-foreground" />
        )}
        {currentUrl && !uploading && (
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 rounded-full flex items-center justify-center transition-colors">
            <Camera size={16} className="text-primary-foreground opacity-0 group-hover:opacity-100" />
          </div>
        )}
        {uploading && currentUrl && (
          <div className="absolute inset-0 bg-foreground/40 rounded-full flex items-center justify-center">
            <Loader2 size={16} className="animate-spin text-primary-foreground" />
          </div>
        )}
      </button>
      {!currentUrl && !uploading && (
        <button
          onClick={() => inputRef.current?.click()}
          className="text-[10px] text-primary font-medium -mt-1 hover:underline cursor-pointer"
        >
          Lägg till foto
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
    </>
  );
}
