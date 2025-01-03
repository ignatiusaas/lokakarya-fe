import {Routes} from '@angular/router';
import {LoginComponent} from './pages/login/login.component';
import {HomeComponent} from './pages/home/home.component';
import {authGuard} from './guard/auth.guard';
import {ManageUserComponent} from './pages/manage-user/manage-user.component';
import {EmployeeSuggestionComponent} from './pages/employee-suggestion/employee-suggestion.component';
import {ManageDevPlanComponent} from './pages/manage-dev-plan/manage-dev-plan.component';
import {ManageTechnicalSkillComponent} from './pages/manage-technical-skill/manage-technical-skill.component';
import {ManageAttitudeSkillComponent} from './pages/manage-attitude-skill/manage-attitude-skill.component';
import {ManageAchievementComponent} from './pages/manage-achievement/manage-achievement.component';
import {EmployeeDevPlanComponent} from './pages/employee-dev-plan/employee-dev-plan.component';
import {ManageRoleAccessComponent} from './pages/manage-role-access/manage-role-access.component';
import {EmployeeTechnicalSkillComponent} from './pages/employee-technical-skill/employee-technical-skill.component';
import {EmployeeAttitudeSkillComponent} from './pages/employee-attitude-skill/employee-attitude-skill.component';
import {EmployeeAchievementSkillComponent} from './pages/employee-achievement-skill/employee-achievement-skill.component';
import {AssessmentSummaryComponent} from './pages/assessment-summary/assessment-summary.component';
import {ManageDivisionComponent} from './pages/manage-division/manage-division.component';
import {ViewAssessmentSummaryComponent} from './pages/view-assessment-summary/view-assessment-summary.component';

export const routes: Routes = [
  {path: 'login', component: LoginComponent},
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-user',
    component: ManageUserComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-dev-plan',
    component: ManageDevPlanComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-technical-skill',
    component: ManageTechnicalSkillComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-attitude-skill',
    component: ManageAttitudeSkillComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-role-access',
    component: ManageRoleAccessComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-achievement',
    component: ManageAchievementComponent,
    canActivate: [authGuard],
  },
  {
    path: 'manage-division',
    component: ManageDivisionComponent,
    canActivate: [authGuard],
  },

  {
    path: 'employee-suggestion',
    component: EmployeeSuggestionComponent,
    canActivate: [authGuard],
  },
  {
    path: 'employee-technical-skill',
    component: EmployeeTechnicalSkillComponent,
    canActivate: [authGuard],
  },
  {
    path: 'employee-dev-plan',
    component: EmployeeDevPlanComponent,
    canActivate: [authGuard],
  },
  {
    path: 'employee-attitude-skill',
    component: EmployeeAttitudeSkillComponent,
    canActivate: [authGuard],
  },
  {
    path: 'employee-achievement-skill',
    component: EmployeeAchievementSkillComponent,
    canActivate: [authGuard],
  },
  {
    path: 'assessment-summary',
    component: AssessmentSummaryComponent,
    canActivate: [authGuard],
  },
  {
    path: 'view-assessment-summary',
    component: ViewAssessmentSummaryComponent,
    canActivate: [authGuard],
  },
  {path: '**', redirectTo: '/home'},
];
