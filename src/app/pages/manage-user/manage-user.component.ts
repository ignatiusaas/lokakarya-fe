import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormControl,
} from '@angular/forms';
import { PrimeNGConfig } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { FormArray } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import { InputSwitchModule } from 'primeng/inputswitch';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-manage-user',
  standalone: true,
  templateUrl: './manage-user.component.html',
  styleUrls: ['./manage-user.component.scss'],
  imports: [
    CommonModule,
    PrimeNgModule,
    FormsModule,
    ReactiveFormsModule,
    InputSwitchModule,
    NavbarComponent,
  ],
  providers: [ConfirmationService, MessageService],
})
export class ManageUserComponent implements OnInit {
  employees: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  maxDate: Date = new Date();
  divisions: any[] = [];
  currentYear: string = new Date().getFullYear().toString();
  mode: 'create' | 'edit' = 'create';
  roles: any[] = []; // Stores the available roles
  selectedRoles: { [roleId: string]: boolean } = {};
  currentUserId: string = this.decodeJWT() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  displayCreatedDialog: boolean = false;
  editForm!: FormGroup;
  allEmployees: any[] = [];
  globalFilterValue: string = '';
  userName: string = '';
  generatedPassword: string = '';
  private previouslyAssignedRoles: string[] = [];
  selectedUserId: string = '';
  selectedEmail: string = '';

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Initializing ManageUserComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchEmployees();
    this.fetchRoles();
    console.log('Component Initialized');
  }
  private decodeJWT(): string | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.userId) {
        console.log('Decoded userId:', decoded.userId);
        return decoded.userId;
      } else {
        console.error('userId not found in JWT.');
        return null;
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  private initializeForm() {
    console.log('Initializing Edit Form...');
    this.editForm = this.fb.group({
      id: [''],
      username: ['', Validators.required],
      full_name: ['', Validators.required],
      position: ['', Validators.required],
      email_address: ['', [Validators.required, Validators.email]],
      employee_status: ['', Validators.required],
      join_date: ['', Validators.required],
      enabled: [true],
      division_id: ['', Validators.required],
      roles: this.fb.array([]),
    });
    this.currentUserId = this.decodeJWT() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  navigateHome() {
    console.log('Navigating to Home');
    this.router.navigate(['/home']);
  }
  fetchEmployees(event?: any): void {
    console.log('Fetching Employees...');

    if (!this.allEmployees.length || this.allEmployees.length > 0) {
      this.loading = true;

      this.http
        .get<any>('http://103.150.93.202:8081/appuser/get/all')
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.allEmployees = response.content || [];
            this.totalRecords = this.allEmployees.length;

            this.applyFiltersAndPagination(event);
          },
          error: (error) => {
            console.error('Error Fetching Employees:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch employees.',
            });
          },
        });
    } else {
      this.applyFiltersAndPagination(event);
    }
  }

  applyFiltersAndPagination(event?: any): void {
    const startIndex = event?.first || 0;
    const endIndex = startIndex + this.rowsPerPage;

    // Apply global filtering (search)
    let filteredEmployees = this.globalFilterValue
      ? this.allEmployees.filter((employee) =>
          Object.values(employee).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allEmployees]; // Clone array for sorting

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1; // 1 = ascending, -1 = descending
      filteredEmployees.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0; // Handle null/undefined values

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    // Apply pagination
    this.employees = filteredEmployees.slice(startIndex, endIndex);

    // Update totalRecords for pagination
    this.totalRecords = filteredEmployees.length;
  }

  paginateEmployees(event?: any): void {
    const startIndex = event?.first || 0;
    const endIndex = startIndex + this.rowsPerPage;

    this.employees = this.allEmployees.slice(startIndex, endIndex);
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.isProcessing = true;
    this.editForm.reset({
      id: '',
      username: '',
      full_name: '',
      position: '',
      email_address: '',
      employee_status: '',
      join_date: '',
      enabled: true,
      division_id: '',
    });

    this.fetchDivisions(() => {
      console.log('Divisions Fetched for Create');
      this.displayEditDialog = true;
      this.isProcessing = false;
    });
  }

  deleteEmployee(employeeId: string): void {
    console.log('Deleting Employee with ID:', employeeId);

    // Prevent multiple delete operations if already processing
    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this employee?',
      accept: () => {
        // User confirmed deletion
        this.isProcessing = true; // Start processing
        this.http
          .delete(`http://103.150.93.202:8081/appuser/${employeeId}`)
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: () => {
              console.log('Employee Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Employee deleted successfully!',
              });
              this.fetchEmployees(); // Refresh the employee list
            },
            error: (error) => {
              console.error('Error Deleting Employee:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete employee.',
              });
            },
          });
      },
      reject: () => {
        // User canceled deletion
        console.log('Delete action canceled');
        this.isProcessing = false; // Ensure `isProcessing` is false if canceled
      },
    });
  }

  editEmployee(employeeId: string): void {
    console.log('Editing Employee with ID:', employeeId);
    this.isEditFormLoading = true; // Start loading form
    this.isProcessing = true; // Start processing
    this.mode = 'edit';

    const employeeRequest = this.http.get<any>(
      `http://103.150.93.202:8081/appuser/${employeeId}`
    );
    const divisionsRequest = this.http.get<any>(
      `http://103.150.93.202:8081/division/all`
    );

    // Reset the edit form dialog visibility
    this.displayEditDialog = false;

    forkJoin([employeeRequest, divisionsRequest])
      .pipe(finalize(() => (this.isProcessing = false))) // Stop processing after all operations
      .subscribe({
        next: ([employeeResponse, divisionsResponse]) => {
          console.log('Employee and Divisions Fetched:', {
            employee: employeeResponse,
            divisions: divisionsResponse,
          });

          this.divisions = divisionsResponse.content;
          const employee = employeeResponse.content;

          this.currentUserId = this.decodeJWT() || '';
          this.selectedUserId = employee.id;
          this.selectedEmail = employee.email_address;
          this.userName = employee.username;
          console.log('Current User ID:', this.currentUserId);

          this.editForm.patchValue({
            ...employee,
            join_date: new Date(employee.join_date),
            updated_by: this.currentUserId,
          });

          this.fetchUserRoles(employeeId).then(() => {
            console.log('User roles loaded successfully.');
            this.displayEditDialog = true; // Open the dialog after roles are loaded
            this.isEditFormLoading = false; // Form is now fully loaded
          });
        },
        error: (error) => {
          console.error('Error Fetching Employee or Divisions:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee or division details.',
          });
          this.isEditFormLoading = false; // Stop loading in case of error
        },
      });
  }

  fetchDivisions(callback: () => void): void {
    console.log('Fetching Divisions...');
    this.http.get<any>('http://103.150.93.202:8081/division/all').subscribe({
      next: (response) => {
        this.divisions = response.content;
        console.log('Divisions Fetched:', this.divisions);
        callback();
      },
      error: (error) => {
        console.error('Error Fetching Divisions:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch divisions.',
        });
      },
    });
  }

  getRoleFormControl(index: number): FormControl<boolean> {
    return this.rolesFormArray.at(index) as FormControl<boolean>;
  }

  async saveEmployee(): Promise<void> {
    console.log('Saving Employee. Mode:', this.mode);

    this.selectedUserId = '';
    if (!this.editForm.valid) {
      console.error('Form Validation Failed:', this.editForm.errors);
      this.isProcessing = false;
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields.',
      });
      return;
    }

    const payload = {
      ...this.editForm.value,
      ...(this.mode === 'create'
        ? { created_by: this.currentUserId }
        : { updated_by: this.currentUserId }),
    };

    const request$ =
      this.mode === 'create'
        ? this.http.post('http://103.150.93.202:8081/appuser/create', payload)
        : this.http.put('http://103.150.93.202:8081/appuser/update', payload);

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
        let userId: string = '';
        console.log(response.content);
        if (this.mode === 'create') {
          userId = response?.content?.id;
          this.userName = response?.content?.username;
          this.generatedPassword = response?.content?.password;
        } else {
          userId = this.editForm.get('id')?.value;
        }
        if (!userId) {
          console.error('User ID could not be determined.');
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to retrieve user ID after saving.',
          });
          return;
        }
        console.log('User ID:');

        // Fetch the previously assigned roles from `this.selectedRoles`
        const previouslyAssignedRoles = Object.keys(this.selectedRoles).filter(
          (roleId) => this.selectedRoles[roleId] === true
        );

        console.log('Previously Assigned Roles:', previouslyAssignedRoles);

        // Determine current selected roles
        const currentRoles = this.rolesFormArray.value
          .map((checked: boolean, index: number) =>
            checked ? this.roles[index].id : null
          )
          .filter((id: string | null) => id !== null);

        const rolesToAssign = currentRoles.filter(
          (roleId: string) => !previouslyAssignedRoles.includes(roleId)
        );
        const uncheckedRoles = previouslyAssignedRoles.filter(
          (roleId: string) => !currentRoles.includes(roleId)
        );

        console.log('Roles to Assign:', rolesToAssign);
        console.log('Unchecked Roles:', uncheckedRoles);

        this.updateUserRoles(userId, rolesToAssign, uncheckedRoles);

        console.log('Employee Saved Successfully:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Employee saved successfully.',
        });

        // Reset sort and filter
        this.resetSortAndFilter();

        // Mbuh
        if (this.mode === 'create') {
          this.displayCreatedDialog = true;
        }

        // Close dialog and fetch employees
        this.displayEditDialog = false;
        this.fetchEmployees();
      },
      error: (error) => {
        console.error('Error Saving Employee:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save employee.',
        });
      },
    });
  }

  resetSortAndFilter(): void {
    console.log('Resetting sort and filter...');

    this.globalFilterValue = '';

    const dt = document.querySelector('p-table') as any;
    if (dt) {
      dt.sortField = null;
      dt.sortOrder = null;
    }

    this.applyFiltersAndPagination({ first: 0 });
  }

  fetchRoles(): void {
    this.isProcessing = true;
    this.http
      .get<any>('http://103.150.93.202:8081/approle/all')
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          this.roles = response.content;
          console.log('Roles fetched:', this.roles);

          this.rolesFormArray.clear();
          this.roles.forEach(() =>
            this.rolesFormArray.push(this.fb.control(false))
          );
        },
        error: (err) => {
          console.error('Failed to fetch roles:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch roles.',
          });
        },
      });
  }

  get rolesFormArray(): FormArray {
    return this.editForm.get('roles') as FormArray;
  }

  fetchUserRoles(userId: string): Promise<void> {
    console.log('Fetching user roles...');
    this.isProcessing = true; // Start processing

    return new Promise((resolve, reject) => {
      this.http
        .get<any>(`http://103.150.93.202:8081/appuserrole/get2/${userId}`)
        .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
        .subscribe({
          next: (response) => {
            console.log('User Roles Fetched:', response);
            const userRoles = response.content.map((role: any) => role.role_id);

            // Update `this.selectedRoles`
            this.selectedRoles = {};
            userRoles.forEach((roleId: string) => {
              this.selectedRoles[roleId] = true; // Mark the role as assigned
            });

            // Clear and update roles in the form array
            this.rolesFormArray.clear();
            this.roles.forEach((role) =>
              this.rolesFormArray.push(
                this.fb.control(userRoles.includes(role.id))
              )
            );

            console.log('Roles patched for User:', this.rolesFormArray.value);
            console.log('Selected Roles:', this.selectedRoles);
            resolve(); // Notify success
          },
          error: (err) => {
            console.error('Failed to fetch user roles:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch user roles.',
            });
            reject(err); // Notify failure
          },
        });
    });
  }

  assignRolesToUser(userId: string): void {
    const rolesToAssign = this.roles
      .map((role, index) => (this.rolesFormArray.value[index] ? role.id : null))
      .filter((roleId) => roleId !== null);

    if (rolesToAssign.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No roles selected for assignment.',
      });
      return;
    }

    const roleRequests = rolesToAssign.map((roleId) =>
      this.http
        .get<any>(`http://103.150.93.202:8081/appuserrole/${userId}/${roleId}`)
        .pipe(
          finalize(() => (this.isProcessing = false)),
          finalize(() => console.log(`Check for role ${roleId} completed.`))
        )
        .toPromise()
        .then((response) => {
          if (response?.content) {
            console.log(`Role already assigned: ${roleId}`);
            return null;
          } else {
            return this.http
              .post('http://103.150.93.202:8081/appuserrole/create', {
                role_id: roleId,
                user_id: userId,
              })
              .toPromise()
              .then(() => {
                console.log(`Role assigned successfully: ${roleId}`);
              });
          }
        })
    );

    this.isProcessing = true;

    Promise.all(roleRequests)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Roles assigned successfully!',
        });
        console.log('All roles assigned successfully:', rolesToAssign);
      })
      .catch((err) => {
        console.error('Failed to assign some roles:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to assign roles.',
        });
      })
      .finally(() => {
        this.isProcessing = false;
      });
  }

  private updateUserRoles(
    userId: string,
    rolesToAssign: string[],
    uncheckedRoles: string[]
  ): void {
    console.log('Updating roles...');
    console.log('Roles to Assign:', rolesToAssign);
    console.log('Unchecked Roles:', uncheckedRoles);

    const addRoleRequests = rolesToAssign.map((roleId) =>
      this.http
        .post('http://103.150.93.202:8081/appuserrole/create', {
          role_id: roleId,
          user_id: userId,
        })
        .toPromise()
    );

    const deleteRoleRequests = uncheckedRoles.map((roleId) =>
      this.http
        .get<any>(`http://103.150.93.202:8081/appuserrole/${userId}/${roleId}`)
        .toPromise()
        .then((response) => {
          const userRoleId = response?.content;
          if (userRoleId) {
            console.log(
              `Deleting role ${roleId} with userRoleId ${userRoleId}`
            );
            return this.http
              .delete(`http://103.150.93.202:8081/appuserrole/${userRoleId}`)
              .toPromise()
              .then(() => undefined); // Explicitly return void
          } else {
            console.log(
              `Role ${roleId} is not assigned to user ${userId}, skipping.`
            );
            return Promise.resolve(); // Explicitly return a resolved Promise<void>
          }
        })
    );

    Promise.all([...addRoleRequests, ...deleteRoleRequests])
      .then(() => console.log('Role updates completed successfully.'))
      .catch((err) => console.error('Error updating roles:', err));
  }

  submitEmployee(): void {
    console.log('Submitting Employee. Mode:', this.mode);

    this.isProcessing = true;

    const username = this.editForm.get('username')?.value;
    const email = this.editForm.get('email_address')?.value;
    console.log('Username:', username);
    console.log('Email:', email);

    Promise.all([
      this.validateUsername(username),
      this.validateEmail(email),
    ]).then(([isUsernameUnique, isEmailUnique]) => {
      if (!isUsernameUnique && this.mode === 'create') {
        this.isProcessing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'Username already exists. Please choose a different username.',
        });
        return;
      }

      if (!isEmailUnique && email !== this.selectedEmail) {
        this.isProcessing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Email already exists. Please provide a different email.',
        });
        return;
      }

      this.saveEmployee();
    });
  }

  private validateUsername(username: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.http
        .get<any>(`http://103.150.93.202:8081/appuser/username/${username}`)
        .subscribe({
          next: (response: any) => {
            console.log('Username validation response:', response);
            resolve(response.content === null);
          },
          error: (err) => {
            console.error('Unexpected error during username validation:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'An error occurred while validating the username.',
            });
            resolve(false);
          },
        });
    });
  }

  private validateEmail(email: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.http
        .get<any>(`http://103.150.93.202:8081/appuser/email/${email}`)
        .subscribe({
          next: (response: any) => {
            console.log('Email validation response:', response);
            resolve(response.content === null);
          },
          error: (err) => {
            console.error('Unexpected error during email validation:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'An error occurred while validating the email.',
            });
            resolve(false);
          },
        });
    });
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  filterGlobal(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    const table = document.querySelector('p-table') as any;
    table.filterGlobal(filterValue, 'contains');
  }

  applyGlobalFilter(): void {
    console.log('Global filter applied:', this.globalFilterValue);
  }

  copyToClipboard(value: string): void {
    navigator.clipboard.writeText(value).then(
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Copied',
          detail: `Copied to clipboard: ${value}`,
        });
      },
      () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to copy to clipboard',
        });
      }
    );
  }

  async resetPassword(): Promise<void> {
    this.confirmationService.confirm({
      message: 'Are sure you want to reset password?',
      accept: async () => {
        const payload = {
          user_id: this.selectedUserId,
        };

        console.log(this.selectedUserId);
        console.log(payload);

        try {
          const response = await this.http
            .put<any>('http://103.150.93.202:8081/auth/resetpassword', payload)
            .toPromise();

          console.log('Password reset response:', response);
          this.generatedPassword = response?.content;

          this.displayEditDialog = false;
          this.displayCreatedDialog = true;
        } catch (error) {
          console.error('Error during password reset:', error);
        }
      },

      reject: () => {},
    });
  }
}
