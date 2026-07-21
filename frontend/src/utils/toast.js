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
      background: '#fff',
      color: '#1a1a2e',
      iconColor: '#10B981',
    });
  },
  error: (message) => {
    return Toast.fire({
      icon: 'error',
      title: message,
      background: '#fff',
      color: '#1a1a2e',
      iconColor: '#EF4444',
      timer: 5000,
    });
  },
  warning: (message) => {
    Toast.fire({
      icon: 'warning',
      title: message,
      background: '#fff',
      color: '#1a1a2e',
      iconColor: '#F59E0B',
      timer: 4000,
    });
  },
  info: (message) => {
    Toast.fire({
      icon: 'info',
      title: message,
      background: '#fff',
      color: '#1a1a2e',
      iconColor: '#3B82F6',
    });
  },
};

export default showToast;