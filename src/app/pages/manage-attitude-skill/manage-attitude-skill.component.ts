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
  selector: 'app-manage-attitude-skill',
  standalone: true,
  imports: [
    NavbarComponent,
    CommonModule,
    PrimeNgModule,
    FormsModule,
    ReactiveFormsModule,
    InputSwitchModule,
  ],
  templateUrl: './manage-attitude-skill.component.html',
  styleUrl: './manage-attitude-skill.component.scss',
  providers: [ConfirmationService, MessageService],
})
export class ManageAttitudeSkillComponent implements OnInit {
  groupedSkills: any[] = [];
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
  filteredGroupedSkills: any[] = [];
  filteredAttSkills: any[] = [];
  allAttSkills: any[] = [];
  groupedAttitudeSkills: any[] = [];
  groupOptions: any[] = [];
  currentPage: number = 1;
  selectedOrderColumn: string = 'group_name';
  selectedOrderDirection: string = 'asc';

  orderColumnGroupOptions: any[] = [
    { label: 'Group Name', value: 'group_name' },
    { label: 'Weight', value: 'percentage' },
  ];

  constructor(
    private http: HttpClient,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig
  ) {}

  ngOnInit(): void {
    this.primengConfig.ripple = true;
    this.initializeForms();
    this.fetchData();
    console.log('Component Initialized');
  }

  private initializeForms() {
    console.log('Initializing Forms...');
    this.editForm = this.fb.group({
      id: [''],
      attitude_skill: ['', Validators.required],
      group_id: ['', Validators.required],
      enabled: [true],
    });

    this.editGroupForm = this.fb.group({
      id: [''],
      group_name: ['', Validators.required],
      percentage: [
        0,
        [Validators.required, Validators.min(0), Validators.max(100)],
      ],
      enabled: [true],
    });

    this.currentUserId = this.extractCurrentUserId() || '';
    console.log(
      'Forms Initialized:',
      this.editForm.value,
      this.editGroupForm.value
    );
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

  fetchData(): void {
    console.log('Fetching Groups and Attitude Skills...');
    this.loading = true;

    const url = 'https://hiremeplease.freeddns.org/attitudeskill/sorch';

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
          console.log('Attitude Skills Fetched:', response);
          this.allAttSkills = response.content || [];
          this.totalRecords = response.total_data;

          // Combine the groups and skills
          this.groupedAttitudeSkills = this.allAttSkills.reduce(
            (groups: any[], skill: any) => {
              const groupIndex = groups.findIndex(
                (g) => g.group_id === skill.group_id
              );
              if (groupIndex === -1) {
                // Add a new group with its first skill
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
          console.log('Grouped Attitude Skills:', this.groupedAttitudeSkills);
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

  openCreateAttitudeSkillDialog(): void {
    console.log('Opening Create Attitude Skill Dialog');
    this.mode = 'create';
    this.editForm.reset({
      id: '',
      attitude_skill: '',
      enabled: true,
    });

    this.displayEditDialog = true;
    this.isProcessing = false;
  }

  openCreateGroupDialog(): void {
    console.log('Opening Create Group Dialog');
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

  async saveGroupAttSkill(): Promise<void> {
    console.log('Saving Group Attitude Skill. Mode:', this.mode);

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
        console.log('Duplicate Check Result:', isDuplicate);
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
            'https://hiremeplease.freeddns.org/groupattitudeskill/create',
            payload
          )
        : this.http.put(
            'https://hiremeplease.freeddns.org/groupattitudeskill/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Group attitude skill saved successfully.',
        });
        this.displayGroupEditDialog = false;
        this.fetchData();
      },
      error: (error) => {
        console.error('Error Saving Group Attitude Skill:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save group attitude skill.',
        });
      },
    });
  }

  editGroupAttSkill(groupId: string): void {
    console.log('Editing Group Attitude Skill with ID:', groupId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit'; // Set mode to edit for group

    const groupRequest = this.http.get<any>(
      `https://hiremeplease.freeddns.org/groupattitudeskill/${groupId}`
    );

    this.displayGroupEditDialog = false;

    groupRequest.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (groupResponse) => {
        console.log('Group Attitude Skill Fetched:', groupResponse);
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
        console.error('Error Fetching Group Attitude Skill:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch group attitude skill details.',
        });
        this.isEditFormLoading = false;
      },
    });
  }

  deleteGroupAttSkill(groupId: string): void {
    console.log('Deleting Group Attitude Skill with ID:', groupId);

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this group attitude skill?',
      accept: () => {
        this.http
          .delete(
            `https://hiremeplease.freeddns.org/groupattitudeskill/${groupId}`
          )
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Group attitude skill deleted successfully.',
              });
              this.fetchData();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete group attitude skill.',
              });
            },
          });
      },
    });
  }

  // Attitude Skill Methods
  openAttSkillEditDialog(skill: any): void {
    console.log('Editing Attitude Skill:', skill);
    this.mode = 'edit';
    this.editForm.patchValue({
      ...skill,
    });
    this.displayEditDialog = true;
  }

  async saveAttitudeSkill(): Promise<void> {
    console.log('Saving Attitude Skill. Mode:', this.mode);

    if (!this.editForm.valid) {
      console.error(
        'Attitude Skill Form Validation Failed:',
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
        const selectedName = this.editForm.value.attitude_skill;
        const isDuplicate = await this.confirmDuplicateAttitudeSkill(
          selectedName
        );
        console.log('Duplicate Check Result:', isDuplicate);
        if (isDuplicate) {
          this.isProcessing = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Attitude skill already exists.',
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
        ? this.http.post(
            'https://hiremeplease.freeddns.org/attitudeskill/create',
            payload
          )
        : this.http.put(
            'https://hiremeplease.freeddns.org/attitudeskill/update',
            payload
          );

    request$.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Attitude skill saved successfully.',
        });
        this.displayEditDialog = false;
        this.fetchData();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save attitude skill.',
        });
      },
    });
  }

  editAttSkill(skillId: string): void {
    console.log('Editing Attitude Skill with ID:', skillId);
    this.isEditFormLoading = true;
    this.isProcessing = true;
    this.mode = 'edit'; // Set mode to edit for attitude skill

    const skillRequest = this.http.get<any>(
      `https://hiremeplease.freeddns.org/attitudeskill/${skillId}`
    );

    this.displayEditDialog = false;

    skillRequest.pipe(finalize(() => (this.isProcessing = false))).subscribe({
      next: (skillResponse) => {
        console.log('Attitude Skill Fetched:', skillResponse);
        const skill = skillResponse.content;

        this.editForm.patchValue({
          id: skill.id,
          attitude_skill: skill.attitude_skill,
          group_id: skill.group_id,
          enabled: skill.enabled,
        });

        this.displayEditDialog = true;
        this.isEditFormLoading = false;
      },
      error: (error) => {
        console.error('Error Fetching Attitude Skill:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch attitude skill details.',
        });
        this.isEditFormLoading = false;
      },
    });
  }

  deleteAttSkill(skillId: string): void {
    console.log('Deleting Attitude Skill with ID:', skillId);

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this attitude skill?',
      accept: () => {
        this.http
          .delete(`https://hiremeplease.freeddns.org/attitudeskill/${skillId}`)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Attitude skill deleted successfully.',
              });
              this.fetchData();
            },
            error: (error) => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete attitude skill.',
              });
            },
          });
      },
    });
  }

  submitAttitudeSkill(): void {
    console.log('Submitting Attitude Skill. Mode:', this.mode);
    this.isProcessing = true;
    this.saveAttitudeSkill();
  }

  submitGroupAttitudeSkill(): void {
    console.log('Submitting Group Attitude Skill. Mode:', this.mode);
    this.isProcessing = true;
    this.saveGroupAttSkill();
  }

  private searchTimeout: any;

  onSearch(): void {
    console.log('Applying global search:', this.globalFilterValue);

    clearTimeout(this.searchTimeout);

    this.searchTimeout = setTimeout(() => {
      console.log('Searching with:', this.globalFilterValue);
      this.fetchData();
    }, 500);
  }

  toggleOrderDirection(): void {
    this.selectedOrderDirection =
      this.selectedOrderDirection === 'asc' ? 'desc' : 'asc';
    console.log('Order direction toggled:', this.selectedOrderDirection);

    this.fetchData();
  }

  async confirmDuplicateAttitudeSkill(name: string): Promise<boolean> {
    try {
      const response = await this.http
        .get<{ content: boolean }>(
          `https://hiremeplease.freeddns.org/attitudeskill/name/${name}`
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
          `https://hiremeplease.freeddns.org/groupattitudeskill/name/${name}`
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
