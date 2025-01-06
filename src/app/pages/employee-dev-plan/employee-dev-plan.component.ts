import { NgForOf, NgIf } from '@angular/common';
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
import { ButtonDirective } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';

@Component({
  selector: 'app-employee-dev-plan',
  standalone: true,
  imports: [
    ButtonDirective,
    CalendarModule,
    CardModule,
    CheckboxModule,
    DialogModule,
    DropdownModule,
    FormsModule,
    InputSwitchModule,
    InputTextModule,
    NgForOf,
    NgIf,
    RadioButtonModule,
    ReactiveFormsModule,
    ToastModule,
    PrimeNgModule,
    NavbarComponent,
  ],
  templateUrl: './employee-dev-plan.component.html',
  styleUrls: ['./employee-dev-plan.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class EmployeeDevPlanComponent implements OnInit {
  empDevPlans: any[] = [];
  loading: boolean = false;
  isProcessing: boolean = false;
  maxDate: Date = new Date();
  employees: any[] = [];
  currentUserId: string = this.extractCurrentUserId() || '';
  isEditFormLoading: boolean = false;
  displayEditDialog: boolean = false;
  editForm!: FormGroup;
  globalFilterValue: string = '';
  currentRoles: any[] = this.extractCurrentRoles() || [];
  devPlans: any[] = [];
  selectedUserId: string = this.extractCurrentUserId() || '';
  selectedName: string = '';
  selectedAssessmentYear: Date = new Date();
  selectedYear: number = this.selectedAssessmentYear.getFullYear();
  groupedEmpDevPlans: any[] = []; // For grouped data
  assessmentYear: Date | null = null;
  isLocked: boolean = false;

  devPlansMap: Map<string, string> = new Map();

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private fb: FormBuilder,
    private primengConfig: PrimeNGConfig,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.primengConfig.ripple = true;

    this.initializeForm();
    this.fetchSelectedUserName();

    if (this.currentRoles.includes('HR')) {
      this.fetchEmployees();
      this.selectedUserId = ''; // HR needs to select a user
    } else {
      this.selectedUserId = this.currentUserId;
    }

    // Fetch dev plans and employee dev plans, then group them
    Promise.all([this.fetchDevPlans(), this.fetchEmpDevPlans()])
      .then(() => {
        this.groupAllDevPlans();
      })
      .catch((error) => {
        console.error('Error fetching initial data:', error);
      });
  }

  fetchSelectedUserName(): void {
    if (!this.selectedUserId || this.selectedUserId === '') {
      console.warn('No user selected.');
      this.selectedUserId = this.currentUserId;
    }
    const userUrl = `${environment.apiUrl}/appuser/get/${this.selectedUserId}`;

    this.http.get<any>(userUrl).subscribe({
      next: (response) => {
        const user = response.content;
        if (user && user.full_name) {
          this.selectedName = user.full_name;
        } else {
          console.warn('User full name not found in response.');
          this.selectedName = '';
        }
      },
      error: (error) => {
        console.error('Error fetching user full name:', error);
        this.selectedName = '';
      },
    });
  }

  fetchEmployees(): void {
    this.http.get<any>(environment.apiUrl + '/appuser/all').subscribe({
      next: (response) => {
        this.employees = response.content || [];
      },
      error: (error) => {
        console.error('Error fetching employees:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to fetch employees.',
        });
      },
    });
  }

  fetchDevPlans(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<any>(environment.apiUrl + '/devplan/all').subscribe({
        next: (response) => {
          this.devPlans = (response.content || []).filter(
            (plan: any) => plan.enabled === true
          );
          // Create a map for quick lookup
          this.devPlansMap.clear();
          this.devPlans.forEach((plan: any) => {
            this.devPlansMap.set(plan.id, plan.plan);
          });

          resolve();
        },
        error: (error) => {
          console.error('Error fetching dev plans:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to fetch dev plans.',
          });
          reject(error);
        },
      });
    });
  }

  fetchEmpDevPlans(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fetchSelectedUserName();
      this.selectedYear = this.selectedAssessmentYear.getFullYear();

      this.loading = true;

      const planUrl = `${environment.apiUrl}/empdevplan/get/${this.selectedUserId}/${this.selectedYear}`;

      this.http
        .get<any>(planUrl)
        .pipe(finalize(() => (this.loading = false)))
        .subscribe({
          next: (response) => {
            this.empDevPlans = response.content || [];
            this.groupAllDevPlans();

            const summaryUrl = `${environment.apiUrl}/assessmentsummary/get/${this.selectedUserId}/${this.selectedYear}`;
            this.http.get<any>(summaryUrl).subscribe({
              next: (summaryResponse) => {
                this.isLocked = summaryResponse?.content?.status === 2;
              },
              error: (err) => {
                console.error('Error fetching assessment summary:', err);
              },
            });

            resolve();
          },
          error: (error) => {
            console.error('Error Fetching Employee DevPlans:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to fetch employee plans.',
            });
            reject(error);
          },
        });
    });
  }

  openEditDialog(): void {
    this.displayEditDialog = true;
    this.isProcessing = false;
    this.assessmentYear = this.selectedAssessmentYear;

    this.groupAllDevPlans(true);
  }

  async saveEmployeeDevPlan(): Promise<void> {
    this.isProcessing = true;

    const requests: Promise<any>[] = [];

    for (const group of this.groupedEmpDevPlans) {
      for (const entry of group.descriptions) {
        if (!entry.description) {
          console.warn('Skipping incomplete entry:', entry);
          continue;
        }

        const payload: any = {
          user_id: this.selectedUserId || this.currentUserId,
          dev_plan_id: group.dev_plan_id,
          assessment_year: this.selectedYear,
          too_bright: entry.description,
        };

        if (entry.id && !entry.id.startsWith('new_')) {
          payload['id'] = entry.id;
          payload['updated_by'] = this.currentUserId;
          requests.push(
            this.http
              .put(environment.apiUrl + '/empdevplan/update', payload)
              .toPromise()
          );
        } else {
          // Create new entry
          payload['created_by'] = this.currentUserId;
          requests.push(
            this.http
              .post(environment.apiUrl + '/empdevplan/create', payload)
              .toPromise()
          );
        }
      }
    }

    try {
      await Promise.all(requests);
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Employee Dev Plans saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving employee dev plans:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save employee dev plans.',
      });
    } finally {
      this.isProcessing = false;
      this.displayEditDialog = false;
      this.fetchEmpDevPlans().then(() => this.groupAllDevPlans());
    }
  }

  submitEmployeeDevPlan(): void {
    this.isProcessing = true;
    this.confirmationService.confirm({
      message: 'Are you sure? Once approved, changes cannot be undone',
      header: 'Confirm Submission',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.saveEmployeeDevPlan();
      },
      reject: () => {
        this.isProcessing = false;
      },
    });
  }

  addPlanEntry(group: any): void {
    group.descriptions.push({
      id: this.generateUniqueId(),
      description: '',
      isCompleted: false,
    });
  }

  removePlanEntry(group: any, index: number): void {
    group.descriptions.splice(index, 1);
  }

  generateUniqueId(): string {
    return 'new_' + Math.random().toString(36).substr(2, 9);
  }

  trackByDevPlanId(index: number, entry: any): string {
    return entry.dev_plan_id;
  }

  trackByIndex(index: number, item: any): number {
    return index;
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

  private extractCurrentRoles(): any[] {
    const token = localStorage.getItem('auth-token');

    if (!token) {
      console.error('No JWT found in local storage.');
      return [];
    }

    try {
      const decoded: any = jwtDecode(token);

      if (decoded && decoded.roles) {
        return decoded.roles;
      } else {
        console.error('roles not found in JWT.');
        return [];
      }
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return [];
    }
  }

  private initializeForm() {
    this.editForm = this.fb.group({
      id: [''],
      user_id: [''],
      dev_plan_id: ['', Validators.required],
      description: ['', Validators.required],
      assessment_year: ['', Validators.required],
    });
    this.currentUserId = this.extractCurrentUserId() || '';
  }

  private groupAllDevPlans(includeAll: boolean = false): void {
    const grouped = new Map<string, any>();

    this.devPlans.forEach((devPlan) => {
      grouped.set(devPlan.id, {
        dev_plan_id: devPlan.id,
        dev_plan_name: devPlan.plan,
        descriptions: [],
      });
    });

    // Merge employee data
    this.empDevPlans.forEach((empPlan) => {
      const devPlanId = empPlan.dev_plan_id;
      const group = grouped.get(devPlanId);
      if (group) {
        group.descriptions.push({
          id: empPlan.id,
          description: empPlan.too_bright,
        });
      } else {
        console.warn(
          `Dev Plan ID ${devPlanId} not found for employee plan ${empPlan.id}`
        );
      }
    });

    this.groupedEmpDevPlans = Array.from(grouped.values());
  }
}
