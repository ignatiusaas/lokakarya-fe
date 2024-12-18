import { Component, OnInit } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { NgForOf, NgIf } from '@angular/common';
import {
  ConfirmationService,
  MessageService,
  PrimeNGConfig,
  PrimeTemplate,
} from 'primeng/api';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-employee-suggestion',
  standalone: true,
  imports: [
    ButtonDirective,
    CalendarModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    InputSwitchModule,
    InputTextModule,
    NgForOf,
    NgIf,
    PrimeTemplate,
    RadioButtonModule,
    ReactiveFormsModule,
    TableModule,
    ToastModule,
    PrimeNgModule,
    NavbarComponent,
  ],
  templateUrl: './employee-suggestion.component.html',
  styleUrl: './employee-suggestion.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class EmployeeSuggestionComponent implements OnInit {
  empSuggestions: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  maxDate: Date = new Date();
  employees: any[] = [];
  mode: 'create' | 'update' = 'create';
  roles: any[] = [];
  selectedRoles: { [roleId: string]: boolean } = {};
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  allEmpSuggestions: any[] = [];
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  showOnlyMine: boolean = false;

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Initializing EmployeeSuggestionComponent');
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchEmpSuggestions();
    console.log('Component Initialized');
  }

  private extractCurrentUserId(): string | null {
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

  private extractCurrentRoles(): any | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in session storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.roles) {
        console.log('Decoded roles:', decoded.roles);
        return decoded.roles;
      } else {
        console.error('roles not found in JWT.');
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
      user_id: [''],
      suggestion: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  fetchEmpSuggestions(event?: any): void {
    console.log('Fetching Employee Suggestions...');

    if (!this.allEmpSuggestions.length || this.allEmpSuggestions.length > 0) {
      this.loading = true;

      let suggestionUrl = '';
      if (this.currentRoles.includes('HR')) {
        suggestionUrl =
          'https://hiremeplease.freeddns.org/empsuggestion/get/all';
      } else {
        suggestionUrl =
          'https://hiremeplease.freeddns.org/empsuggestion/by/' +
          this.currentUserId;
      }
      console.log('Suggestion URL:', suggestionUrl);

      this.http
        .get<any>(suggestionUrl)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.allEmpSuggestions = response.content || [];
            this.totalRecords = this.allEmpSuggestions.length;

            // Apply filtering, sorting, and pagination
            this.applyFiltersAndPagination(event);
          },
          error: (error) => {
            console.error('Error Fetching Employee Suggestions:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch employee suggestions.',
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
    let filteredSuggestions = this.globalFilterValue
      ? this.allEmpSuggestions.filter((empSuggestion) =>
          Object.values(empSuggestion).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allEmpSuggestions];

    if (this.showOnlyMine) {
      filteredSuggestions = filteredSuggestions.filter(
        (suggestion) => suggestion.user_id === this.currentUserId
      );
    }

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredSuggestions.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    // Apply pagination
    this.empSuggestions = filteredSuggestions.slice(startIndex, endIndex);

    // Update totalRecords for pagination
    this.totalRecords = filteredSuggestions.length;
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      user_id: '',
      suggestion: '',
      assessment_year: '',
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  deleteEmpSuggestion(suggestionId: string): void {
    console.log('Deleting Employee Suggestion with ID:', suggestionId);

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this employee suggestion?',
      accept: () => {
        // User confirmed deletion
        this.isProcessing = true;
        this.http
          .delete(
            `https://hiremeplease.freeddns.org/empsuggestion/${suggestionId}`
          )
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: () => {
              console.log('Employee Suggestion Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Employee Suggestion Deleted Successfully!',
              });
              this.fetchEmpSuggestions();
            },
            error: (error) => {
              console.error('Error Deleting Employee:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete employee suggestion.',
              });
            },
          });
      },
      reject: () => {
        // User canceled deletion
        console.log('Delete action canceled');
        this.isProcessing = false;
      },
    });
  }

  editEmpSuggestion(suggestionId: string): void {
    console.log('Editing Employee Suggestion with ID:', suggestionId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'update';

    // Fetch the employee suggestion details
    const empSuggestionRequest = this.http.get<any>(
      `https://hiremeplease.freeddns.org/empsuggestion/${suggestionId}`
    );

    this.displayEditDialog = false; // Ensure the dialog is closed before loading data

    empSuggestionRequest
      .pipe(finalize(() => (this.isProcessing = false))) // Reset processing state
      .subscribe({
        next: (employeeSuggestionResponse) => {
          console.log(
            'Employee Suggestion Fetched:',
            employeeSuggestionResponse
          );
          const empSuggestion = employeeSuggestionResponse.content;

          this.currentUserId = this.extractCurrentUserId() || '';
          console.log('Current User ID:', this.currentUserId);

          // Patch the form with fetched suggestion data
          this.editForm.patchValue({
            ...empSuggestion,
            assessment_year: new Date(empSuggestion.assessment_year, 0, 1), // Set to Jan 1 of the year
            updated_by: this.currentUserId,
          });

          this.displayEditDialog = true; // Show the dialog after data is ready
          this.isEditFormLoading = false; // Stop the loading indicator
        },
        error: (error) => {
          console.error('Error Fetching Employee Suggestion:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch employee suggestion details.',
          });
          this.isEditFormLoading = false; // Stop the loading indicator
        },
      });
  }

  async saveEmployeeSuggestion(): Promise<void> {
    console.log('Saving Employee Suggestion. Mode:', this.mode);

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

    const date = new Date(this.editForm.value.assessment_year);
    const assessmentYear = date.getFullYear();

    try {
      const isDuplicate = await this.confirmDuplicate(
        this.currentUserId,
        assessmentYear
      );
      console.log('Duplicate Check Result:', isDuplicate);
      if (isDuplicate) {
        console.log(this.currentUserId, assessmentYear);
        this.isProcessing = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            'You have already submitted an employee suggestion for this year.',
        });
        return;
      }
    } catch (error) {
      console.error('Error during duplicate check:', error);
      this.isProcessing = false;
      return;
    }

    const payload = {
      ...this.editForm.value,
      user_id: this.currentUserId,
      assessment_year: assessmentYear,
      ...(this.mode === 'create'
        ? { created_by: this.currentUserId }
        : { updated_by: this.currentUserId }),
    };

    console.log(payload);

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            'https://hiremeplease.freeddns.org/empsuggestion/create',
            payload
          )
        : this.http.put(
            'https://hiremeplease.freeddns.org/empsuggestion/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
        console.log('Employee Suggestion Saved Successfully:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Employee suggestion saved successfully.',
        });

        this.resetSortAndFilter();

        this.displayEditDialog = false;
        this.fetchEmpSuggestions();
      },
      error: (error) => {
        console.error('Error Saving Employee Suggestion:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save employee suggestion.',
        });
      },
    });
  }

  async confirmDuplicate(
    userId: string,
    assessmentYear: number
  ): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `https://hiremeplease.freeddns.org/empsuggestion/${userId}/${assessmentYear}`
        )
        .toPromise();

      if (response && response.content !== null) {
        return response.content;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error Checking Duplicate:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to check for duplicates.',
      });
      throw error;
    }
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

  submitEmployeeSuggestion(): void {
    console.log('Submitting Employee Suggestion. Mode:', this.mode);
    this.isProcessing = true;
    this.saveEmployeeSuggestion();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }
}
