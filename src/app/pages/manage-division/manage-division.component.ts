import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';
import { HttpClient } from '@angular/common/http';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PrimeNGConfig } from 'primeng/api';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { InputSwitchModule } from 'primeng/inputswitch';

@Component({
  selector: 'app-manage-division',
  standalone: true,
  imports: [
    NavbarComponent,
    CommonModule,
    PrimeNgModule,
    FormsModule,
    ReactiveFormsModule,
    InputSwitchModule,
  ],
  templateUrl: './manage-division.component.html',
  styleUrl: './manage-division.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class ManageDivisionComponent implements OnInit {
  divisions: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  maxDate: Date = new Date();
  employees: any[] = [];
  mode: 'create' | 'edit' = 'create';
  roles: any[] = [];
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  globalFilterValue: string = '';
  currentPage: number = 1;
  selectedOrderColumn: string = 'division_name';
  selectedOrderDirection: string = 'asc';

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig
  ) {}
  ngOnInit(): void {
    this.primengConfig.ripple = true;

    this.initializeForm();
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

  private initializeForm() {
    console.log('Initializing Edit Form...');
    this.editForm = this.fb.group({
      id: [''],
      division_name: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  fetchDivisions(event?: any): void {
    console.log('Fetching Divisions...');

    const pageIndex = event?.first ? event.first / event.rows : 0;
    const pageSize = event?.rows || this.rowsPerPage;

    this.loading = true;
    this.currentPage = pageIndex + 1;
    this.rowsPerPage = pageSize;

    const param = {
      keyword: this.globalFilterValue,
      page: this.currentPage,
      pageSize: this.rowsPerPage,
      column: this.selectedOrderColumn,
      order: this.selectedOrderDirection,
    };

    const url = 'https://hiremeplease.freeddns.org/division/sorch';

    console.log('Page Index:', pageIndex);
    console.log('Page Size:', pageSize);
    console.log('URL:', url);
    console.log('Param:', param);

    this.loading = true;
    this.http
      .get<any>(url, { params: param })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          console.log('Divisions Fetched:', response);
          this.divisions = response.content || [];
          this.totalRecords = response.total_data;
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

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      division_name: '',
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  deleteDivision(divisionId: string): void {
    console.log('Deleting Division with ID:', divisionId);

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this division?',
      accept: () => {
        this.isProcessing = true;
        this.http
          .delete(`https://hiremeplease.freeddns.org/division/${divisionId}`)
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: (response: any) => {
              console.log('Response: ', response);
              if (response?.content === divisionId + ' deleted: false') {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to delete division.',
                });
                return;
              }
              console.log('Division Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Division Deleted Successfully!',
              });
              this.fetchDivisions();
            },
            error: (error) => {
              console.error('Error Deleting Division:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete division.',
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

  editDivision(divisionId: string): void {
    console.log('Editing Division with ID:', divisionId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit';

    const divisionRequest = this.http.get<any>(
      `https://hiremeplease.freeddns.org/division/${divisionId}`
    );

    this.displayEditDialog = false;

    divisionRequest
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (divisionResponse) => {
          console.log('Division Fetched:', divisionResponse);
          const division = divisionResponse.content;

          this.currentUserId = this.extractCurrentUserId() || '';
          console.log('Current User ID:', this.currentUserId);

          this.editForm.patchValue({
            ...division,
            updated_by: this.currentUserId,
          });

          this.displayEditDialog = true;
          this.isEditFormLoading = false;
        },
        error: (error) => {
          console.error('Error Fetching Division:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch division details.',
          });
          this.isEditFormLoading = false;
        },
      });
  }

  async saveDivision(): Promise<void> {
    console.log('Saving Division. Mode:', this.mode);

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

    if (this.mode === 'create') {
      try {
        const selectedName = this.editForm.value.division_name;
        const isDuplicate = await this.confirmDuplicate(selectedName);
        console.log('Duplicate Check Result:', isDuplicate);
        if (isDuplicate) {
          this.isProcessing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Division name already exists.',
          });
          return;
        }
      } catch (error) {
        console.error('Error during duplicate check:', error);
        this.isProcessing = false;
        return;
      }
    }

    const payload = {
      ...this.editForm.value,
      ...(this.mode === 'create'
        ? { created_by: this.currentUserId }
        : { updated_by: this.currentUserId }),
    };

    console.log(payload);

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            'https://hiremeplease.freeddns.org/division/create',
            payload
          )
        : this.http.put(
            'https://hiremeplease.freeddns.org/division/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
        console.log('Division Saved Successfully:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Division saved successfully.',
        });

        this.displayEditDialog = false;
        this.fetchDivisions();
      },
      error: (error) => {
        console.error('Error Saving Division:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save division.',
        });
      },
    });
  }

  submitDivision(): void {
    console.log('Submitting Division. Mode:', this.mode);
    this.isProcessing = true;
    this.saveDivision();
  }

  private searchTimeout: any;

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);

    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      console.log('Searching with:', this.globalFilterValue);
      this.fetchDivisions();
    }, 500);
  }

  toggleOrderDirection(): void {
    this.selectedOrderDirection =
      this.selectedOrderDirection === 'asc' ? 'desc' : 'asc';
    console.log('Order direction toggled:', this.selectedOrderDirection);

    this.fetchDivisions();
  }

  async confirmDuplicate(name: string): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `https://hiremeplease.freeddns.org/division/name/${name}`
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
}
