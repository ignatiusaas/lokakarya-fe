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
import { Router } from '@angular/router';
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
  selector: 'app-manage-achievement',
  standalone: true,
  imports: [
    NavbarComponent,
    CommonModule,
    PrimeNgModule,
    FormsModule,
    ReactiveFormsModule,
    InputSwitchModule,
  ],
  templateUrl: './manage-achievement.component.html',
  styleUrl: './manage-achievement.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class ManageAchievementComponent implements OnInit {
  groupedAchievements: any[] = [];
  totalRecords: number = 0;
  loading: boolean = false;
  isProcessing: boolean = false;
  rowsPerPage: number = 5;
  mode: 'create' | 'edit' = 'create';
  roles: any[] = [];
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  displayGroupEditDialog: boolean = false;
  editForm!: FormGroup;
  editGroupForm!: FormGroup;
  globalFilterValue: string = '';
  filteredGroupedAchievements: any[] = [];
  filteredAchievements: any[] = [];
  allAchievements: any[] = [];
  groupOptions: any[] = [];
  currentPage: number = 1;
  selectedOrderColumn: string = 'group_name';
  selectedOrderDirection: string = 'asc';

  orderColumns: any[] = [
    { label: 'Group Name', value: 'group_name' },
    { label: 'Weight', value: 'percentage' },
  ];
  private searchTimeout: any;

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
    this.initializeForms();
    this.fetchData();
  }

  fetchData(): void {
    this.loading = true;

    const url = environment.apiUrl + '/achievement/sorch';

    const param = {
      keyword: this.globalFilterValue,
      page: 1,
      pageSize: 999,
      column: this.selectedOrderColumn,
      order: this.selectedOrderDirection,
    };

    this.loading = true;
    this.http
      .get<any>(url, { params: param })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.allAchievements = response.content || [];
          this.totalRecords = response.total_data;

          // Combine the groups and skills
          this.groupedAchievements = this.allAchievements.reduce(
            (groups: any[], skill: any) => {
              const groupIndex = groups.findIndex(
                (g) => g.group_id === skill.group_id
              );
              if (groupIndex === -1) {
                groups.push({
                  group_id: skill.group_id,
                  group_name: skill.group_name,
                  group_enabled: skill.group_enabled,
                  percentage: skill.percentage,
                  skills: [skill],
                });
              } else {
                // Add the skill to the existing group
                groups[groupIndex].skills.push(skill);
              }
              return groups;
            },
            []
          );
        },
        error: (error) => {
          console.error('Error Fetching Attitude Skills:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch attitude skills.',
          });
        },
      });
  }

  openCreateAchievementDialog(): void {
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      achievement: '',
      enabled: true,
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  openCreateGroupDialog(): void {
    this.mode = 'create';
    this.editGroupForm.reset({
      id: '',
      group_name: '',
      percentage: null,
      enabled: true,
    });

    this.displayGroupEditDialog = true;
    this.isProcessing = false;
  }

  async saveGroupAchievement(): Promise<void> {
    if (!this.editGroupForm.valid) {
      console.error('Group Form Validation Failed:', this.editGroupForm.errors);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields.',
      });
      return;
    }

    if (this.mode === 'create') {
      try {
        const selectedName = this.editGroupForm.value.group_name;
        const isDuplicate = await this.confirmDuplicateGroup(selectedName);
        if (isDuplicate) {
          this.isProcessing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Group name already exists.',
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
      ...this.editGroupForm.value,
      ...(this.mode === 'create'
        ? { created_by: this.currentUserId }
        : { updated_by: this.currentUserId }),
    };

    const request$ =
      this.mode === 'create'
        ? this.http.post(
            environment.apiUrl + '/groupachievement/create',
            payload
          )
        : this.http.put(
            environment.apiUrl + '/groupachievement/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Group achievement saved successfully.',
        });
        this.displayGroupEditDialog = false;
        this.fetchData();
      },
      error: (error) => {
        console.error('Error Saving Group Achievement:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save group achievement.',
        });
      },
    });
  }

  editGroupAchievement(groupId: string): void {
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit'; // Set mode to edit for group

    const groupRequest = this.http.get<any>(
      `${environment.apiUrl}/groupachievement/${groupId}`
    );

    this.displayGroupEditDialog = false;

    groupRequest.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (groupResponse) => {
        const group = groupResponse.content;

        this.editGroupForm.patchValue({
          id: group.id,
          group_name: group.group_name,
          percentage: group.percentage,
          enabled: group.enabled,
        });

        this.displayGroupEditDialog = true;
        this.isEditFormLoading = false;
      },
      error: (error) => {
        console.error('Error Fetching Group Achievement:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch group achievement details.',
        });
        this.isEditFormLoading = false;
      },
    });
  }

  deleteGroupAchievement(groupId: string): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this group achievement?',
      accept: () => {
        this.http
          .delete(`${environment.apiUrl}/groupachievement/${groupId}`)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Group achievement deleted successfully.',
              });
              this.fetchData();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete group achievement.',
              });
            },
          });
      },
    });
  }

  // Achievement Methods
  openAchievementEditDialog(skill: any): void {
    this.mode = 'edit';
    this.editForm.patchValue({
      ...skill,
    });
    this.displayEditDialog = true;
  }

  async saveAchievement(): Promise<void> {
    if (!this.editForm.valid) {
      console.error(
        'Achievement Form Validation Failed:',
        this.editForm.errors
      );
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields.',
      });
      return;
    }

    if (this.mode === 'create') {
      try {
        const selectedName = this.editForm.value.achievement;
        const isDuplicate = await this.confirmDuplicateAchievement(
          selectedName
        );
        if (isDuplicate) {
          this.isProcessing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Achievement already exists.',
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
        ? this.http.post(environment.apiUrl + '/achievement/create', payload)
        : this.http.put(environment.apiUrl + '/achievement/update', payload);

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Achievement saved successfully.',
        });
        this.displayEditDialog = false;
        this.fetchData();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save achievement.',
        });
      },
    });
  }

  editAchievement(skillId: string): void {
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit'; // Set mode to edit for achievement

    const skillRequest = this.http.get<any>(
      `${environment.apiUrl}/achievement/${skillId}`
    );

    this.displayEditDialog = false;

    skillRequest.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (skillResponse) => {
        const skill = skillResponse.content;

        this.editForm.patchValue({
          id: skill.id,
          achievement: skill.achievement,
          group_id: skill.group_id,
          enabled: skill.enabled,
        });

        this.displayEditDialog = true;
        this.isEditFormLoading = false;
      },
      error: (error) => {
        console.error('Error Fetching Achievement:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch achievement details.',
        });
        this.isEditFormLoading = false;
      },
    });
  }

  deleteAchievement(skillId: string): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this achievement?',
      accept: () => {
        this.http
          .delete(`${environment.apiUrl}/achievement/${skillId}`)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Achievement deleted successfully.',
              });
              this.fetchData();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete achievement.',
              });
            },
          });
      },
    });
  }

  submitAchievement(): void {
    this.isProcessing = true;
    this.saveAchievement();
  }

  submitGroupAchievement(): void {
    this.isProcessing = true;
    this.saveGroupAchievement();
  }

  onSearch(): void {
    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      this.fetchData();
    }, 500);
  }

  toggleOrderDirection(): void {
    this.selectedOrderDirection =
      this.selectedOrderDirection === 'asc' ? 'desc' : 'asc';
    this.fetchData();
  }

  async confirmDuplicateAchievement(achievement: string): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `${environment.apiUrl}/achievement/name/${achievement}`
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

  async confirmDuplicateGroup(name: string): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `${environment.apiUrl}/groupachievement/name/${name}`
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

  private initializeForms() {
    this.editForm = this.fb.group({
      id: [''],
      achievement: ['', Validators.required],
      group_id: ['', Validators.required],
      enabled: [true],
    });

    this.editGroupForm = this.fb.group({
      id: [''],
      group_name: ['', Validators.required],
      percentage: [null, Validators.required],
      enabled: [true],
    });

    this.currentUserId = this.extractCurrentUserId() || '';
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
}
