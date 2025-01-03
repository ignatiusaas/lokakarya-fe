import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private roles: string[] = [];

  constructor(private storageService: StorageService) {
    this.loadRoles();
  }

  loadRoles(): void {
    const token = this.storageService.getItem('auth-token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.roles = payload.roles || [];
    }
  }

  public getUserRoles(): string[] {
    this.loadRoles();
    return this.roles;
  }

  public hasRole(role: string): boolean {
    return this.roles.includes(role);
  }
}
