import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FuseSharedModule } from '@fuse/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from '@fuse/material.module';
import { CrudService } from 'app/main/services/crud.service';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { ExamDashboardComponent } from './exam-dashboard/exam-dashboard.component';
import { FuseSidebarService } from '@fuse/components/sidebar/sidebar.service';
import { PivotViewModule } from '@syncfusion/ej2-angular-pivotview';
import { ConditionalFormattingService, GroupingBarService, FieldListService } from '@syncfusion/ej2-angular-pivotview';
import { CalculatedFieldService } from '@syncfusion/ej2-angular-pivotview';
import { ExamChecklistComponent } from './exam-checklist/exam-checklist.component';

const routes = [
  {
    path: 'admin-exam-masters',
    loadChildren: () => import('./exam-masters/exam-masters.module').then(m => m.ExamMastersModule)
  },
  {
    path: 'admin-pre-examinations',
    loadChildren: () => import('./pre-examination/pre-examination.module').then(m => m.PreExaminationModule)
  },
  {
    path: 'admin-exam-reports',
    loadChildren: () => import('./exam-reports/exam-reports.module').then(m => m.ExamReportsModule)
  },
  {
    path: 'admin-post-examination',
    loadChildren: () => import('./post-examination/post-examination.module').then(m => m.PostExaminationModule)
  },
  {
    path: 'admin-result-processing',
    loadChildren: () => import('./result-processing/result-processing.module').then(m => m.ResultProcessingModule)
  },
  {
    
    path: 'evaluation-process',
    loadChildren: () => import('./evaluation-process/evaluation-process.module').then(m => m.EvaluationProcessModule)
  },
  {
    
    path: 're-evaluation',
    loadChildren: () => import('./re-evaluation/re-evaluation.module').then(m => m.ReEvaluationModule)
  },
  {
    
    path: 'exam-papers-delivery-process',
    loadChildren: () => import('./exam-papers-delivery-process/exam-papers-delivery-process.module').then(m => m.ExamPapersDeliveryProcessModule)
  },
  {
    path: 'exam-dashboard',
    component: ExamDashboardComponent
  },
  {
    path:'exam-checklist',
    component:ExamChecklistComponent
  }
  ];
  
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        FuseSharedModule,
        TranslateModule,
        MaterialModule,
        CommonModule,
        PivotViewModule
    ],
    declarations: [                  
                ExamDashboardComponent, ExamChecklistComponent],
    entryComponents: [
    ],
    schemas: [
        CUSTOM_ELEMENTS_SCHEMA
    ],
    providers: [CrudService, GenericFunctions, ConditionalFormattingService, GroupingBarService, FieldListService, CalculatedFieldService]
  
  })
export class ExaminationModule {
  constructor(
    private _fuseSidebarService: FuseSidebarService,
)
{
    this._fuseSidebarService.getSidebar('navbar').toggleOpen();
}
 }
