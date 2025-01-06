import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
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
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';

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
  private searchTimeout: any;

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
  }

  fetchDivisions(event?: any): void {
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

    const url = environment.apiUrl + '/division/sorch';

    this.loading = true;
    this.http
      .get<any>(url, { params: param })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
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
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      division_name: '',
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  deleteDivision(divisionId: string): void {
    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this division?',
      accept: () => {
        this.isProcessing = true;
        this.http
          .delete(`${environment.apiUrl}/division/${divisionId}`)
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: (response: any) => {
              if (response?.content === divisionId + ' deleted: false') {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'Failed to delete division.',
                });
                return;
              }
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
        this.isProcessing = false;
      },
    });
  }

  editDivision(divisionId: string): void {
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit';

    const divisionRequest = this.http.get<any>(
      `${environment.apiUrl}/division/${divisionId}`
    );

    this.displayEditDialog = false;

    divisionRequest
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (divisionResponse) => {
          const division = divisionResponse.content;

          this.currentUserId = this.extractCurrentUserId() || '';
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

    const request$ =
      this.mode === 'create'
        ? this.http.post(environment.apiUrl + '/division/create', payload)
        : this.http.put(environment.apiUrl + '/division/update', payload);

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
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
    this.isProcessing = true;
    this.saveDivision();
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      this.fetchDivisions();
    }, 500);
  }

  toggleOrderDirection(): void {
    this.selectedOrderDirection =
      this.selectedOrderDirection === 'asc' ? 'desc' : 'asc';
    this.fetchDivisions();
  }

  async confirmDuplicate(name: string): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `${environment.apiUrl}/division/name/${name}`
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

  private extractCurrentUserId(): string | null {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in local storage.');
      return null;
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.userId) {
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
    this.editForm = this.fb.group({
      id: [''],
      division_name: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';
  }
}
