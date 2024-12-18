import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state
) => {
  const router = inject(Router);
  const http = inject(HttpClient);

  if (typeof window === 'undefined' || !window.localStorage) {
    console.error('Session storage is not available.');
    router.navigate(['/login']);
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
    router.navigate(['/login']);
    return false;
  }

  let userRoles: string[] = [];
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    userRoles = payload.roles || [];
  } catch (e) {
    console.error('Failed to parse token payload:', e);
    router.navigate(['/login']);
  }

  const currentRoutePath = route.routeConfig?.path || '';
  console.log(
    `Checking access for route: ${currentRoutePath} with roles:`,
    userRoles
  );

  // Store all available menus for the user's roles
  const availableMenus = new Set<string>();

  try {
    // Fetch menu access for each role and store it in `availableMenus`
    const roleRequests = userRoles.map((role) =>
      http
        .get<any>(`http://103.150.93.202:8081/approlemenu/role/${role}`)
        .toPromise()
    );

    const responses = await Promise.all(roleRequests);

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

    console.log('Available menus for user:', Array.from(availableMenus));

    if (availableMenus.has(currentRoutePath)) {
      console.log(`Access granted to route: ${currentRoutePath}`);
      return true;
    } else {
      console.warn(`Access denied to route: ${currentRoutePath}`);
      router.navigate(['/home']);
      return false;
    }
  } catch (error) {
    console.error('Error while fetching menus for roles:', error);
    router.navigate(['/login']);
    return false;
  }
};
