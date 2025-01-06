import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from '../../services/auth.service';
import { MenuManagerService } from '../../services/menu-manager.service';
import { PrimeNgModule } from '../primeng/primeng.module';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  imports: [CommonModule, PrimeNgModule, ConfirmDialogModule],
  styleUrls: ['./navbar.component.scss'],
  providers: [ConfirmationService],
})
export class NavbarComponent implements OnInit {
  @Output() onLogout = new EventEmitter<void>();
  manageMenus: string[] = [];
  submitMenus: string[] = [];
  otherMenus: string[] = [];
  userName: string | null = null;
  errorMessage: string = '';
  loading: boolean = true;
  isHomePage: boolean = false;
  roles: string[] = [];
  activeDropdown: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private menuManagerService: MenuManagerService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadNavbarData();
  }

  loadNavbarData(): void {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    this.userName = payload.username;

    this.roles = this.authService.getUserRoles();
    const menuNamesRequest = this.menuManagerService.getMenusByRoles(
      this.roles
    );

    menuNamesRequest.subscribe({
      next: (menuResponses: any[]) => {
        const allMenus = menuResponses.flatMap((response: any) =>
          response.content.map((menu: any) => menu.menu_name)
        );

        this.manageMenus = [
          ...new Set(allMenus.filter((menu) => menu.startsWith('manage-'))),
        ];
        this.submitMenus = [
          ...new Set(allMenus.filter((menu) => menu.startsWith('employee-'))),
        ];
        this.otherMenus = [
          ...new Set(
            allMenus.filter(
              (menu) =>
                !menu.startsWith('manage-') && !menu.startsWith('employee-')
            )
          ),
        ];
      },
      error: (err) => {
        console.error('Failed to load menus:', err);
        this.errorMessage = 'Failed to load menus.';
        this.router.navigate(['/login'], {
          queryParams: { warning: 'Session expired. Please log in again.' },
        });
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  logout(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to log out?',
      header: 'Confirm Logout',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // User confirmed logout
        this.onLogout.emit();
        localStorage.clear();
        this.router.navigate(['/login'], {
          queryParams: { warning: 'You have been successfully logged out.' },
        });
      },
      reject: () => {
        // User canceled logout
      },
    });
  }

  navigateTo(menu: string): void {
    const route = `/${menu}`;
    if (!this.isActiveRoute(menu)) {
      this.router.navigate([route]);
    }
  }

  formatMenuName(menu: string): string {
    const formattedMenu = menu.replace(/^(manage-|employee-)/i, '');

    return formattedMenu
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  isActiveRoute(menu: string): boolean {
    const currentRoute = this.router.url;
    return currentRoute.includes(`/${menu}`);
  }

  toggleDropdown(dropdownName: string): void {
    if (this.activeDropdown === dropdownName) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = dropdownName;
    }
  }

  @HostListener('document:click', ['$event'])
  closeDropdown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.activeDropdown = null;
    }
  }
}
