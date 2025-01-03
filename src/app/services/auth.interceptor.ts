import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {Router} from '@angular/router';
import {catchError, throwError} from 'rxjs';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const excludedEndpoints = ['/auth/sign-in'];
  const token = localStorage.getItem('auth-token');

  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch (e) {
      return true;
    }
  };

  if (!token || isTokenExpired(token)) {
    if (!excludedEndpoints.some((url) => req.url.includes(url))) {
      localStorage.clear();
      router.navigate(['/login'], {
        queryParams: {
          warning: 'Your session has expired. Please log in again.',
        },
      });
      return throwError(() => new Error('Session expired'));
    }
  }

  const clonedRequest = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    : req;

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        localStorage.clear();
        router.navigate(['/login'], {
          queryParams: {warning: 'Unauthorized access. Please log in again.'},
        });
      }
      return throwError(() => error);
    })
  );
};
