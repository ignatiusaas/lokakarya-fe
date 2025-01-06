import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { environment } from '../../environments/environment';

export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state
) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  if (typeof window === 'undefined' || !window.localStorage) {
    console.error('Local storage is not available.');
    return false;
  }

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
    await router.navigate(['/login']);
    return false;
  }

  let userRoles: string[] = [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    userRoles = payload.roles || [];
  } catch (e) {
    console.error('Failed to parse token payload:', e);
    await router.navigate(['/login']);
    return false;
  }

  const currentRoutePath = route.routeConfig?.path || '';
  const availableMenus = new Set<string>();

  try {
    // 🛑 Wait for role menu requests to finish before proceeding
    const roleRequests = userRoles.map((role) =>
      http
        .get<any>(`${environment.apiUrl}/approlemenu/role/${role}`)
        .toPromise()
    );

    // ⏳ Wait for all the requests to resolve
    const responses = await Promise.all(roleRequests);

    // Add globally accessible menus
    availableMenus.add('home');
    availableMenus.add('login');
    if (
      userRoles.includes('HR') ||
      userRoles.includes('MGR') ||
      userRoles.includes('SVP')
    ) {
      availableMenus.add('view-assessment-summary');
    } else {
      availableMenus.add('assessment-summary');
    }

    responses.forEach((response) => {
      if (response && response.content) {
        response.content.forEach((menu: any) => {
          availableMenus.add(menu.menu_name);
        });
      }
    });

    if (availableMenus.has(currentRoutePath)) {
      return true;
    } else {
      console.warn(`❌ Access denied to route: ${currentRoutePath}`);
      await router.navigate(['/home']);
      return false;
    }
  } catch (error) {
    console.error('💥 Error while fetching menus for roles:', error);
    await router.navigate(['/login']);
    return false;
  }
};
