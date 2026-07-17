// Toast notification utility using SweetAlert2 toast
// Provides professional top-right toast notifications

import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const showToast = {
  success: (message) => {
    Toast.fire({
      icon: 'success',
      title: message,
      background: '#10B981',
      color: '#fff',
      iconColor: '#fff',
    });
  },
  error: (message) => {
    Toast.fire({
      icon: 'error',
      title: message,
      background: '#EF4444',
      color: '#fff',
      iconColor: '#fff',
      timer: 5000,
    });
  },
  warning: (message) => {
    Toast.fire({
      icon: 'warning',
      title: message,
      background: '#F59E0B',
      color: '#fff',
      iconColor: '#fff',
      timer: 4000,
    });
  },
  info: (message) => {
    Toast.fire({
      icon: 'info',
      title: message,
      background: '#3B82F6',
      color: '#fff',
      iconColor: '#fff',
    });
  },
};

export default showToast;