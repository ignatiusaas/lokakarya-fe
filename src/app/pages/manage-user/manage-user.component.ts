import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
} from 'primeng/api';
import { InputSwitchModule } from 'primeng/inputswitch';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';

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
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  maxDate: Date = new Date();
  divisions: any[] = [];
  currentYear: string = new Date().getFullYear().toString();
  mode: 'create' | 'edit' = 'create';
  roles: any[] = [];
  selectedRoles: { [roleId: string]: boolean } = {};
  currentUserId: string = this.decodeJWT() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  displayCreatedDialog: boolean = false;
  editForm!: FormGroup;
  globalFilterValue: string = '';
  userName: string = '';
  generatedPassword: string = '';
  selectedUserId: string = '';
  selectedEmail: string = '';
  currentPage: number = 1;
  selectedOrderColumn: string = 'full_name';
  selectedOrderDirection: string = 'asc';

  orderColumns: { label: string; value: string }[] = [
    { label: 'Username', value: 'username' },
    { label: 'Full Name', value: 'full_name' },
    { label: 'Email Address', value: 'email_address' },
    { label: 'Position', value: 'position' },
    { label: 'Status', value: 'employee_status' },
    { label: 'Division', value: 'division_name' },
  ];
  private searchTimeout: any;

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig
  ) {}

  get rolesFormArray(): FormArray {
    return this.editForm.get('roles') as FormArray;
  }

  ngOnInit(): void {
    console.log('Initializing ManageUserComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchRoles();
    console.log('Component Initialized');
  }

  toggleOrderDirection(): void {
    this.selectedOrderDirection =
      this.selectedOrderDirection === 'asc' ? 'desc' : 'asc';
    console.log('Order direction toggled:', this.selectedOrderDirection);

    this.fetchEmployees();
  }

  fetchEmployees(event?: any): void {
    console.log('Fetching Employees...');
    console.log('Global Filter Value:', this.globalFilterValue);

    const pageIndex = event?.first ? event.first / event.rows : 0;
    const pageSize = event?.rows || this.rowsPerPage;

    this.isProcessing = true;
    this.currentPage = pageIndex + 1;
    this.rowsPerPage = pageSize;

    const param = {
      keyword: this.globalFilterValue,
      page: this.currentPage,
      pageSize: this.rowsPerPage,
      column: this.selectedOrderColumn,
      order: this.selectedOrderDirection,
    };

    const url = `https://hiremeplease.freeddns.org/appuser/sorch`;

    console.log('Page Index:', pageIndex);
    console.log('Page Size:', pageSize);
    console.log('URL:', url);
    console.log('Param:', param);

    this.http
      .get<any>(url, { params: param })
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (response) => {
          this.employees = response.content || [];
          this.totalRecords = response.total_data;
          console.log('Employees Fetched:', this.employees);
          console.log('Total Records:', this.totalRecords);
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
          .delete(`https://hiremeplease.freeddns.org/appuser/${employeeId}`)
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
      `https://hiremeplease.freeddns.org/appuser/${employeeId}`
    );
    const divisionsRequest = this.http.get<any>(
      `https://hiremeplease.freeddns.org/division/all`
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
    this.http
      .get<any>('https://hiremeplease.freeddns.org/division/all')
      .subscribe({
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
        ? this.http.post(
            'https://hiremeplease.freeddns.org/appuser/create',
            payload
          )
        : this.http.put(
            'https://hiremeplease.freeddns.org/appuser/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
        console.log('Save Employee Response:', response);
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

  fetchRoles(): void {
    this.isProcessing = true;
    this.http
      .get<any>('https://hiremeplease.freeddns.org/approle/all')
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

  fetchUserRoles(userId: string): Promise<void> {
    console.log('Fetching user roles...');
    this.isProcessing = true; // Start processing

    return new Promise((resolve, reject) => {
      this.http
        .get<any>(
          `https://hiremeplease.freeddns.org/appuserrole/get2/${userId}`
        )
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

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);

    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      console.log('Searching with:', this.globalFilterValue);
      this.fetchEmployees();
    }, 500);
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
            .put<any>(
              'https://hiremeplease.freeddns.org/auth/resetpassword',
              payload
            )
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

  private decodeJWT(): string | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in local storage.');
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
        .post('https://hiremeplease.freeddns.org/appuserrole/create', {
          role_id: roleId,
          user_id: userId,
        })
        .toPromise()
    );

    const deleteRoleRequests = uncheckedRoles.map((roleId) =>
      this.http
        .get<any>(
          `https://hiremeplease.freeddns.org/appuserrole/${userId}/${roleId}`
        )
        .toPromise()
        .then((response) => {
          const userRoleId = response?.content;
          if (userRoleId) {
            console.log(
              `Deleting role ${roleId} with userRoleId ${userRoleId}`
            );
            return this.http
              .delete(
                `https://hiremeplease.freeddns.org/appuserrole/${userRoleId}`
              )
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

  private validateUsername(username: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.http
        .get<any>(
          `https://hiremeplease.freeddns.org/appuser/username/${username}`
        )
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
        .get<any>(`https://hiremeplease.freeddns.org/appuser/email/${email}`)
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
}
