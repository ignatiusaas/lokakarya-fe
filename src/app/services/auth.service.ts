import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private roles: string[] = [];

  constructor(
    private storageService: StorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadRoles();
  }

  // Deteksi apakah sedang berjalan di SSR (Server-Side Rendering)
  private isSSR(): boolean {
    return isPlatformServer(this.platformId);
  }

  // Ambil token dari storage
  public getToken(): string | null {
    if (this.isSSR()) {
      return null;
    }
    return this.storageService.getItem('auth-token');
  }

  // Cek apakah token valid
  public isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  // Parsing roles dari token
  loadRoles(): void {
    if (this.isSSR()) {
      this.roles = [];
      return;
    }
    const token = this.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.roles = payload.roles || [];
      } catch {
        this.roles = [];
      }
    }
  }

  public getUserRoles(): string[] {
    this.loadRoles();
    return this.roles;
  }

  // Cek user punya role tertentu
  public hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }
}
