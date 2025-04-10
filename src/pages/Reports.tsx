import { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Box,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import { supabase } from '../lib/supabase';
import { Customer, Product } from '../types';
import { sendDailyReport } from '../lib/dailyReport';
import SendIcon from '@mui/icons-material/Send';

interface Stats {
  totalCustomers: number;
  totalCalls: number;
  totalVisits: number;
  topProducts: Array<{ name: string; count: number }>;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

export default function Reports() {
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalCalls: 0,
    totalVisits: 0,
    topProducts: [],
  });

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Toplam müşteri sayısı
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Toplam arama ve ziyaret sayıları
      const { data: customers } = await supabase
        .from('customers')
        .select('last_call_date, last_visit_date');

      const totalCalls = customers?.filter(c => c.last_call_date).length || 0;
      const totalVisits = customers?.filter(c => c.last_visit_date).length || 0;

      // En çok kullanılan ürünler
      const { data: products } = await supabase
        .from('products')
        .select('name');

      const productCounts = products?.reduce((acc, product) => {
        acc[product.name] = (acc[product.name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topProducts = Object.entries(productCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalCustomers: totalCustomers || 0,
        totalCalls,
        totalVisits,
        topProducts,
      });
    } catch (error) {
      console.error('İstatistikler alınırken hata oluştu:', error);
      setSnackbar({
        open: true,
        message: 'İstatistikler alınırken bir hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleTestReport = async () => {
    try {
      setLoading(true);
      await sendDailyReport();
      setSnackbar({
        open: true,
        message: 'Test raporu başarıyla gönderildi',
        severity: 'success',
      });
    } catch (error) {
      console.error('Test raporu gönderilirken hata oluştu:', error);
      setSnackbar({
        open: true,
        message: 'Test raporu gönderilirken hata oluştu',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Raporlar
        </Typography>
        <Button
          variant="contained"
          onClick={handleTestReport}
          disabled={loading}
          startIcon={<SendIcon />}
        >
          Test Raporu Gönder
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Toplam Müşteri
              </Typography>
              <Typography variant="h4">
                {stats.totalCustomers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Toplam Arama
              </Typography>
              <Typography variant="h4">
                {stats.totalCalls}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Toplam Ziyaret
              </Typography>
              <Typography variant="h4">
                {stats.totalVisits}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              En Çok Kullanılan Ürünler
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ürün Adı</TableCell>
                    <TableCell align="right">Müşteri Sayısı</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.topProducts.map((product) => (
                    <TableRow key={product.name}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell align="right">{product.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 