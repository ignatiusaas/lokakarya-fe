import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MenuManagerService {
  private baseUrl = 'https://hiremeplease.freeddns.org/auth/role';
  private menuCache = new Map<string, any>();

  constructor(private http: HttpClient) {}

  // Fetch menu for a single role
  getMenuByRole(roleName: string): Observable<any> {
    if (this.menuCache.has(roleName)) {
      return of(this.menuCache.get(roleName)); // Return cached value if available
    }

    return this.http.get(`${this.baseUrl}/${roleName}`).pipe(
      tap((menu) => this.menuCache.set(roleName, menu)), // Cache the menu response
      catchError((error: unknown) => {
        console.error(`Error fetching menu for role: ${roleName}`, error);
        return throwError(() => error); // Propagate the error
      })
    );
  }

  // Fetch menus for multiple roles
  getMenusByRoles(roleNames: string[]): Observable<any[]> {
    const requests = roleNames.map((role) =>
      this.getMenuByRole(role).pipe(
        catchError((error: unknown) => {
          console.warn(`Skipping failed menu fetch for role: ${role}`, error);
          return of(null); // Return null for failed requests
        })
      )
    );

    return forkJoin(requests).pipe(
      map((responses) => responses.filter((response) => response !== null)) // Filter out null results
    );
  }
}
