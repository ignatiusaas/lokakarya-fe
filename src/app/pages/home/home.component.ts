import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EMPTY, finalize, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    PrimeNgModule,
    NavbarComponent,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [ConfirmationService, MessageService],
})
export class HomeComponent {
  userDetails: any = null;
  errorMessage: string = '';
  loading: boolean = true;
  userId: string = '';
  displayChangePasswordDialog: boolean = false;
  changePasswordForm!: FormGroup;
  changePassLoading: boolean = false;
  passwordMatches: boolean = false;
  currentRoles: any[] = this.extractCurrentRoles() || [];

  isAttSkillFilled: boolean = false;
  isDevPlanFilled: boolean = false;
  isSuggestionFilled: boolean = false;
  isTechSkillFilled: boolean = false;
  isAchFilled: boolean = false;
  isAssFilled: boolean = false;

  showIncomplete: boolean = false;
  showDropdown: boolean = false;

  currentYear: number = new Date().getFullYear();

  constructor(
    private router: Router,
    private http: HttpClient,
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    public messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.initializeForm();
    if (this.currentRoles.includes('USER')) {
      this.checkSubmission();
    }
  }

  navigateTo(path: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate([`/${path}`]);
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  loadUserData(): void {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const payload = JSON.parse(atob(token.split('.')[1]));
    this.userId = payload.userId;

    this.http
      .get(`${environment.apiUrl}/appuser/get/${this.userId}`)
      .subscribe({
        next: (response: any) => {
          this.userDetails = response.content;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load user data.';
          console.error(err);
          this.router.navigate(['/login'], {
            queryParams: { warning: 'Session expired. Please log in again.' },
          });
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  openChangePasswordDialog(): void {
    this.displayChangePasswordDialog = true;
    this.changePasswordForm.reset();
  }

  changePassword(): void {
    if (!this.changePasswordForm.valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Incomplete Form',
        detail: 'Please fill out all fields correctly.',
      });
      return;
    }

    console.log('Attempting to change password...');

    this.confirmationService.confirm({
      message: 'Are you sure you want to change your password?',
      header: 'Confirm Change Password',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.changePassLoading = true;

        const currentPassword = this.changePasswordForm.value.currentPassword;
        const newPassword = this.changePasswordForm.value.newPassword;

        const loginPayload = {
          username: this.userDetails.username,
          password: currentPassword,
        };

        this.http
          .post(environment.apiUrl + '/auth/sign-in', loginPayload, {
            responseType: 'text',
          })
          .pipe(
            switchMap(() => {
              if (newPassword == currentPassword) {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Change Password Failed',
                  detail:
                    'New password cannot be the same as the current password.',
                });
                this.changePassLoading = false;
                return EMPTY;
              }
              const changePassPayload = {
                user_id: this.userId,
                new_password: newPassword,
              };
              return this.http.put(
                environment.apiUrl + '/auth/changepassword',
                changePassPayload
              );
            }),
            finalize(() => {
              this.changePassLoading = false;
            })
          )
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Password Changed',
                detail: 'Your password has been successfully updated.',
              });
              this.displayChangePasswordDialog = false;
              this.changePasswordForm.reset();
            },
            error: (err) => {
              console.error('Error:', err);
              if (err.status === 500) {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Change Password Failed',
                  detail: 'Current password is incorrect.',
                });
                this.changePassLoading = false;
              } else if (err.status === 400) {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Change Password Failed',
                  detail: 'Invalid request. Please try again.',
                });
                this.changePassLoading = false;
              } else {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Change Password Failed',
                  detail:
                    'An unexpected error occurred. Please try again later.',
                });
                this.changePassLoading = false;
              }
            },
          });
      },
      reject: () => {
        console.log('Password change canceled by user.');
        this.changePassLoading = false;
      },
    });
  }

  checkPasswordMatch(): boolean {
    console.log('Checking password match...');
    this.passwordMatches =
      this.changePasswordForm.value.newPassword ===
      this.changePasswordForm.value.confirmPassword;
    console.log('Password Match:', this.passwordMatches);
    return this.passwordMatches;
  }

  async checkSubmission(): Promise<void> {
    console.log('Checking submission...');
    console.log('Current Year:', this.currentYear);
    console.log('User ID:', this.userId);
    const urls = [
      `${environment.apiUrl}/empattitudeskill/get/${this.userId}/${this.currentYear}`,
      `${environment.apiUrl}/empachievementskill/get/${this.userId}/${this.currentYear}`,
      `${environment.apiUrl}/empsuggestion/${this.userId}/${this.currentYear}`,
      `${environment.apiUrl}/empdevplan/get/${this.userId}/${this.currentYear}`,
      `${environment.apiUrl}/emptechnicalskill/get/${this.userId}/${this.currentYear}`,
      `${environment.apiUrl}/assessmentsummary/get/${this.userId}/${this.currentYear}`,
    ];

    try {
      const [
        AttSkillResponse,
        AchResponse,
        SuggestionResponse,
        DevPlanResponse,
        TechSkillResponse,
        AssResponse,
      ] = await Promise.all(
        urls.map((url) => this.http.get<any>(url).toPromise())
      );

      this.isAttSkillFilled = AttSkillResponse?.content.length > 0;
      this.isAchFilled = AchResponse?.content.length > 0;
      this.isSuggestionFilled = SuggestionResponse?.content !== null;
      this.isDevPlanFilled = DevPlanResponse?.content.length > 0;
      this.isTechSkillFilled = TechSkillResponse?.content.length > 0;
      this.isAssFilled = AssResponse?.content !== null;

      console.log('isAttSkillFilled:', this.isAttSkillFilled);
      console.log('isAchFilled:', this.isAchFilled);
      console.log('isSuggestionFilled:', this.isSuggestionFilled);
      console.log('isDevPlanFilled:', this.isDevPlanFilled);
      console.log('isTechSkillFilled:', this.isTechSkillFilled);
      console.log('isAssFilled:', this.isAssFilled);

      this.showIncomplete =
        !this.isAttSkillFilled ||
        !this.isAchFilled ||
        !this.isSuggestionFilled ||
        !this.isDevPlanFilled ||
        !this.isTechSkillFilled ||
        !this.isAssFilled;

      console.log('showIncomplete:', this.showIncomplete);
    } catch (error) {
      console.error('Error while checking submission:', error);
    }
  }

  private initializeForm() {
    console.log('Initializing Change Password Form...');
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required],
    });
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
        console.log('Decoded roles:', decoded.roles);
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
}
