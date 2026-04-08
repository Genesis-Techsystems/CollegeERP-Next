import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '@fuse/material.module';
import { FuseSharedModule } from '@fuse/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { ToolbarService, PageService, SortService, FilterService, GroupService, GridAllModule, PdfExportService } from '@syncfusion/ej2-angular-grids';
import { GridModule } from '@angular/flex-layout/grid';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { GradeRuleSettingsComponent } from './grade-rule-settings/grade-rule-settings.component';
import { AddGradeRuleModalComponent } from './grade-rule-settings/add-grade-rule-modal/add-grade-rule-modal.component';
import { ApplyModerationRuleComponent } from './apply-moderation-rule/apply-moderation-rule.component';
import { TSheetsComponent } from './t-sheets/t-sheets.component';
import { GraceMarksComponent } from './grace-marks/grace-marks.component';
import { ViewGracemarksModelComponent } from './grace-marks/view-gracemarks-model/view-gracemarks-model.component';
import { VerifyExamMarksComponent } from './verify-exam-marks/verify-exam-marks.component';

const routes = [
  {
    path: 'grade-rule-settings',
    component: GradeRuleSettingsComponent
  },
  {
    path: 'apply-moderation-rule',
    component: ApplyModerationRuleComponent
  },
  {
    path: 't-sheets',
    component: TSheetsComponent
  },
  {
    path:'grace-marks',
    component:GraceMarksComponent
  },
  {
    path:'verify-exam-marks',
    component:VerifyExamMarksComponent
  }
];

@NgModule({
  declarations: [
    GradeRuleSettingsComponent,
    AddGradeRuleModalComponent,
    ApplyModerationRuleComponent, 
    TSheetsComponent, GraceMarksComponent, ViewGracemarksModelComponent, VerifyExamMarksComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FuseSharedModule,
    TranslateModule,
    MaterialModule,
    GridModule,
    GridAllModule,
  ],
  entryComponents: [
    AddGradeRuleModalComponent
  ],
  providers: [CrudService, GenericFunctions,PdfExportService,
    ToolbarService,
    PageService, SortService, FilterService, GroupService, DatePipe]
  
})
export class ResultProcessingModule { }
