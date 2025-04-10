import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  useTheme,
} from '@mui/material';
import { supabase } from '../lib/supabase';

interface CustomerActionsProps {
  customer: {
    id: string;
    name: string;
    call_interval: number;
    visit_interval: number;
    last_call_date: string | null;
    last_visit_date: string | null;
    next_call_date: string | null;
    next_visit_date: string | null;
  };
  onUpdate: () => void;
}

export default function CustomerActions({ customer, onUpdate }: CustomerActionsProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [actionType, setActionType] = useState<'call' | 'visit' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAction = async (type: 'call' | 'visit') => {
    setActionType(type);
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (!actionType) return;

    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + (actionType === 'call' ? customer.call_interval : customer.visit_interval));

      const { error } = await supabase
        .from('customers')
        .update({
          [`last_${actionType}_date`]: today.toISOString(),
          [`next_${actionType}_date`]: nextDate.toISOString(),
        })
        .eq('id', customer.id);

      if (error) throw error;

      onUpdate();
      setOpen(false);
    } catch (error) {
      console.error(`Error updating ${actionType} date:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => handleAction('call')}
        size="small"
        sx={{
          minWidth: 'auto',
          px: 1,
          py: 0.5,
          fontSize: '0.75rem',
        }}
      >
        Arama Yapıldı
      </Button>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => handleAction('visit')}
        size="small"
        sx={{
          minWidth: 'auto',
          px: 1,
          py: 0.5,
          fontSize: '0.75rem',
        }}
      >
        Ziyaret Yapıldı
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>
          {actionType === 'call' ? 'Arama' : 'Ziyaret'} Onayı
        </DialogTitle>
        <DialogContent>
          <Typography>
            {customer.name} için {actionType === 'call' ? 'arama' : 'ziyaret'} yapıldığını onaylıyor musunuz?
            Bir sonraki {actionType === 'call' ? 'arama' : 'ziyaret'} tarihi {new Date(
              new Date().getTime() + 
              (actionType === 'call' ? customer.call_interval : customer.visit_interval) * 24 * 60 * 60 * 1000
            ).toLocaleDateString('tr-TR')} olarak belirlenecek.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>İptal</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading}
          >
            Onayla
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 