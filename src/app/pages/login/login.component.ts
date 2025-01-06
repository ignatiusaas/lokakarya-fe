import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PrimeNgModule } from '../../shared/primeng/primeng.module';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, PrimeNgModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';
  warningMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.route.queryParams.subscribe((params) => {
      this.warningMessage = params['warning'] || null;
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['warning']) {
        this.warningMessage = params['warning'];
      }
    });
  }

  onSubmit() {
    localStorage.clear();
    this.isLoading = true;
    this.errorMessage = '';
    const loginPayload = { username: this.username, password: this.password };

    this.http
      .post(environment.apiUrl + '/auth/sign-in', loginPayload, {
        responseType: 'text',
      })
      .subscribe({
        next: (token: string) => {
          console.log('JWT token received:', token);
          localStorage.setItem('auth-token', token);

          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Decoded JWT payload:', payload);

          this.router.navigate(['/home']);
        },
        error: (err) => {
          console.error('Login error:', err);
          this.errorMessage =
            err.status === 401 || err.status === 500
              ? 'Invalid username/email or password'
              : 'An unexpected error occurred.';
          this.isLoading = false;
        },
      });
  }
}
