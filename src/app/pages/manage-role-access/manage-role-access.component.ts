import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { finalize } from 'rxjs/operators';
import { CheckboxModule } from 'primeng/checkbox';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-role-access',
  standalone: true,
  imports: [
    PrimeNgModule,
    ConfirmDialogModule,
    NavbarComponent,
    CheckboxModule,
    CommonModule,
    FormsModule,
  ],
  templateUrl: './manage-role-access.component.html',
  styleUrl: './manage-role-access.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class ManageRoleAccessComponent implements OnInit {
  roles: any[] = [];
  menus: any[] = [];
  categorizedMenus: { Manage: any[]; Submit: any[] } = {
    Manage: [],
    Submit: [],
  };
  roleMenuAssociations: any[] = [];
  selectedAssociations: Set<string> = new Set();
  isLoading: boolean = false;
  checkboxStates: { [key: string]: boolean } = {};

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  isChecked(roleId: string, menuId: string): boolean {
    const key = `${roleId}~${menuId}`;
    const isChecked = this.selectedAssociations.has(key);
    console.log(`Checkbox State for ${key}:`, isChecked);
    return isChecked;
  }

  initializeCheckboxStates(): void {
    this.checkboxStates = {};

    this.menus.forEach((menu) => {
      this.roles.forEach((role) => {
        const key = `${role.id}~${menu.id}`;
        this.checkboxStates[key] = this.selectedAssociations.has(key);
      });
    });

    console.log('Checkbox States:', this.checkboxStates);
  }

  fetchData(): void {
    this.isLoading = true;

    const rolesRequest = this.http.get<any>(
      'http://103.150.93.202:8081/approle/all'
    );
    const menusRequest = this.http.get<any>(
      'http://103.150.93.202:8081/appmenu/all'
    );
    const associationsRequest = this.http.get<any>(
      'http://103.150.93.202:8081/approlemenu/all'
    );

    Promise.all([
      rolesRequest.toPromise(),
      menusRequest.toPromise(),
      associationsRequest.toPromise(),
    ])
      .then(([rolesResponse, menusResponse, associationsResponse]) => {
        this.roles = rolesResponse.content || [];
        this.menus = menusResponse.content || [];
        this.roleMenuAssociations = associationsResponse.content || [];

        // Categorize menus
        this.categorizedMenus.Manage = this.menus
          .filter((menu) => menu.menu_name.startsWith('manage-'))
          .map((menu) => ({
            ...menu,
            displayName: this.formatMenuName(
              menu.menu_name.replace('manage-', '')
            ),
          }));

        this.categorizedMenus.Submit = this.menus
          .filter((menu) => menu.menu_name.startsWith('employee-'))
          .map((menu) => ({
            ...menu,
            displayName: this.formatMenuName(
              menu.menu_name.replace('employee-', '')
            ),
          }));

        // Process associations
        this.roleMenuAssociations.forEach((assoc) => {
          const key = `${assoc.role_id}~${assoc.menu_id}`;
          this.selectedAssociations.add(key);
          this.checkboxStates[key] = true;
        });

        // Initialize unchecked states
        this.roles.forEach((role) => {
          this.menus.forEach((menu) => {
            const key = `${role.id}~${menu.id}`;
            if (!(key in this.checkboxStates)) {
              this.checkboxStates[key] = false;
            }
          });
        });
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch data.',
        });
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  formatMenuName(menuName: string): string {
    return menuName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  isCheckboxDisabled(roleName: string, menuName: string): boolean {
    if (!roleName || !menuName) return false;
    return roleName === 'HR' && menuName === 'Role Access';
  }

  toggleAssociation(roleId: string, menuId: string): void {
    const key = `${roleId}~${menuId}`;
    if (this.checkboxStates[key]) {
      this.selectedAssociations.add(key);
    } else {
      this.selectedAssociations.delete(key);
    }
    console.log('Updated Associations:', this.selectedAssociations);
  }

  resetAssociations(): void {
    this.selectedAssociations.clear();
    console.log('Reset Associations:', this.selectedAssociations);
    this.roleMenuAssociations.forEach((assoc) =>
      this.selectedAssociations.add(`${assoc.role_id}~${assoc.menu_id}`)
    );
    this.initializeCheckboxStates();
    console.log('Updated Associations:', this.selectedAssociations);
  }

  saveAssociations(): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to save changes?',
      header: 'Confirm Save',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoading = true;

        const newAssociations = Object.keys(this.checkboxStates)
          .filter((key) => this.checkboxStates[key])
          .filter(
            (key) =>
              !this.roleMenuAssociations.some(
                (assoc) => `${assoc.role_id}~${assoc.menu_id}` === key
              )
          );

        const deleteAssociations = this.roleMenuAssociations.filter(
          (assoc) => !this.checkboxStates[`${assoc.role_id}~${assoc.menu_id}`]
        );

        console.log('New Associations:', newAssociations);
        console.log('Delete Associations:', deleteAssociations);

        const saveRequests = newAssociations.map((key) => {
          const [roleId, menuId] = key.split('~');
          const payload = { role_id: roleId, menu_id: menuId };
          console.log('Payload:', payload);
          return this.http.post(
            'http://103.150.93.202:8081/approlemenu/create',
            payload
          );
        });

        const deleteRequests = deleteAssociations.map((assoc) =>
          this.http.delete(`http://103.150.93.202:8081/approlemenu/${assoc.id}`)
        );

        Promise.all([
          ...saveRequests.map((req) => req.toPromise()),
          ...deleteRequests.map((req) => req.toPromise()),
        ])
          .then(() => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Role access saved successfully.',
            });
            this.fetchData();
          })
          .catch((error) => {
            console.error('Error saving associations:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to save role access.',
            });
          })
          .finally(() => {
            this.isLoading = false;
          });
      },
    });
  }
}
