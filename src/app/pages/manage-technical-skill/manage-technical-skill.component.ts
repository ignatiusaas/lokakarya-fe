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
  selector: 'app-manage-technical-skill',
  standalone: true,
  imports: [
    NavbarComponent,
    CommonModule,
    PrimeNgModule,
    FormsModule,
    ReactiveFormsModule,
    InputSwitchModule,
  ],
  templateUrl: './manage-technical-skill.component.html',
  styleUrl: './manage-technical-skill.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class ManageTechnicalSkillComponent implements OnInit {
  techSkills: any[] = [];
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
  allTechSkills: any[] = [];
  globalFilterValue: string = '';

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchTechSkills();
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
      technical_skill: ['', Validators.required],
      enabled: [true],
    });
    this.currentUserId = this.extractCurrentUserId() || '';

    console.log('Form Initialized:', this.editForm.value);
  }

  fetchTechSkills(event?: any): void {
    console.log('Fetching Technical Skills...');

    if (!this.allTechSkills.length || this.allTechSkills.length > 0) {
      this.loading = true;
      this.http
        .get<any>('https://hiremeplease.freeddns.org/technicalskill/all')
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            console.log('Technical Skills Fetched:', response);
            this.allTechSkills = response.content || [];
            this.totalRecords = this.allTechSkills.length;

            this.applyFiltersAndPagination(event);
          },
          error: (error) => {
            console.error('Error Fetching Technical Skills:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch technical skills.',
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

    let filteredSkills = this.globalFilterValue
      ? this.allTechSkills.filter((techSkill) =>
          Object.values(techSkill).some((value) =>
            String(value)
              .toLowerCase()
              .includes(this.globalFilterValue.toLowerCase())
          )
        )
      : [...this.allTechSkills];

    console.log(this.allTechSkills);

    if (event?.sortField) {
      const sortOrder = event.sortOrder || 1;
      filteredSkills.sort((a, b) => {
        const valueA = a[event.sortField];
        const valueB = b[event.sortField];

        if (valueA == null || valueB == null) return 0;

        return (
          valueA.toString().localeCompare(valueB.toString()) * sortOrder || 0
        );
      });
    }

    this.techSkills = filteredSkills.slice(startIndex, endIndex);

    this.totalRecords = filteredSkills.length;
  }

  openCreateDialog(): void {
    console.log('Opening Create Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      technical_skill: '',
      enabled: true,
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  deleteTechSkill(techSkillId: string): void {
    console.log('Deleting Technical Skill with ID:', techSkillId);

    if (this.isProcessing) {
      console.warn('Delete action skipped - already processing');
      return;
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this technical skill?',
      accept: () => {
        this.isProcessing = true;
        this.http
          .delete(
            `https://hiremeplease.freeddns.org/technicalskill/${techSkillId}`
          )
          .pipe(finalize(() => (this.isProcessing = false))) // Stop processing
          .subscribe({
            next: () => {
              console.log('Technical Skill Deleted Successfully');
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Technical Skill Deleted Successfully!',
              });
              this.fetchTechSkills();
            },
            error: (error) => {
              console.error('Error Deleting Technical Skill:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete technical skill.',
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

  editTechSkill(techSkillId: string): void {
    console.log('Editing Technical Skill with ID:', techSkillId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit';

    const techSkillRequest = this.http.get<any>(
      `https://hiremeplease.freeddns.org/technicalskill/${techSkillId}`
    );

    this.displayEditDialog = false;

    techSkillRequest
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: (technicalSkillIResponse) => {
          console.log('Technical Skill Fetched:', technicalSkillIResponse);
          const techSkill = technicalSkillIResponse.content;

          this.currentUserId = this.extractCurrentUserId() || '';
          console.log('Current User ID:', this.currentUserId);

          this.editForm.patchValue({
            ...techSkill,
            enabled: techSkill.enabled,
            updated_by: this.currentUserId,
          });

          this.displayEditDialog = true;
          this.isEditFormLoading = false;
        },
        error: (error) => {
          console.error('Error Fetching Technical Skill:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch technical skill details.',
          });
          this.isEditFormLoading = false;
        },
      });
  }

  async saveTechnicalSkill(): Promise<void> {
    console.log('Saving Technical Skill. Mode:', this.mode);

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
        const selectedName = this.editForm.value.technical_skill;
        const isDuplicate = await this.confirmDuplicate(selectedName);
        console.log('Duplicate Check Result:', isDuplicate);
        if (isDuplicate) {
          this.isProcessing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Technical skill already exists.',
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
            'https://hiremeplease.freeddns.org/technicalskill/create',
            payload
          )
        : this.http.put(
            'https://hiremeplease.freeddns.org/technicalskill/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (response: any) => {
        console.log('Technical Skill Saved Successfully:', response);

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Technical skill saved successfully.',
        });

        this.resetSortAndFilter();

        this.displayEditDialog = false;
        this.fetchTechSkills();
      },
      error: (error) => {
        console.error('Error Saving Technical Skill:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save technical skill.',
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

  submitTechnicalSkill(): void {
    console.log('Submitting Technical Skill. Mode:', this.mode);
    this.isProcessing = true;
    this.saveTechnicalSkill();
  }

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);
    this.applyFiltersAndPagination({ first: 0 });
  }

  async confirmDuplicate(name: string): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `https://hiremeplease.freeddns.org/technicalskill/name/${name}`
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
