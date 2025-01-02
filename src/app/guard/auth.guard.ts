import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state
) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const authService = inject(AuthService);

  // Jika SSR, skip guard dan izinkan saja
  // (karena tidak ada "window" maupun "localStorage" di SSR)
  if (!authService.getToken()) {
    console.log('SSR atau token tidak tersedia, skip guard...');
    return true;
  }

  const token = authService.getToken();
  if (!authService.isTokenValid(token)) {
    console.warn('Token invalid/expired, redirect ke /login');
    await router.navigate(['/login']);
    return false;
  }

  // Roles disimpan di AuthService
  const userRoles = authService.getUserRoles();
  const currentRoutePath = route.routeConfig?.path || '';

  console.log(
    `Checking access for route: ${currentRoutePath} with roles: `,
    userRoles
  );

  // Contoh basic: definisikan menu default
  const availableMenus = new Set<string>(['home', 'login']);

  // Tambah menu berdasarkan role
  if (
    userRoles.includes('HR') ||
    userRoles.includes('MGR') ||
    userRoles.includes('SVP')
  ) {
    availableMenus.add('view-assessment-summary');
  } else {
    availableMenus.add('assessment-summary');
  }

  // Coba fetch menu tambahan dari server
  try {
    const roleRequests = userRoles.map((role) =>
      http
        .get<any>(`https://hiremeplease.freeddns.org/approlemenu/role/${role}`)
        .toPromise()
    );

    // Tunggu semua request selesai
    const responses = await Promise.all(roleRequests);

    responses.forEach((response) => {
      if (response && response.content) {
        response.content.forEach((menu: any) => {
          availableMenus.add(menu.menu_name);
        });
      }
    });

    console.log('Available menus for user:', Array.from(availableMenus));
  } catch (error) {
    console.error('💥 Error while fetching menus for roles:', error);
    await router.navigate(['/login']);
    return false;
  }

  // Cek apakah currentRoutePath termasuk dalam availableMenus
  if (availableMenus.has(currentRoutePath)) {
    console.log(`✅ Access granted to route: ${currentRoutePath}`);
    return true;
  } else {
    console.warn(`❌ Access denied to route: ${currentRoutePath}`);
    await router.navigate(['/home']);
    return false;
  }
};
