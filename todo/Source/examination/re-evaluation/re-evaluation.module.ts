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
import { ReEvaluationFeeComponent } from './re-evaluation-fee/re-evaluation-fee.component';
import { PrintFormsComponent } from './re-evaluation-fee/print-forms/print-forms.component';
import { PrintReevaluationReceiptsComponent } from './re-evaluation-fee/print-reevaluation-receipts/print-reevaluation-receipts.component';
import { SubjectsModalComponent } from './re-evaluation-fee/subjects-modal/subjects-modal.component';


const routes = [
  {
    path: 're-evaluation-fee',
    component: ReEvaluationFeeComponent
  },
  {
    path: 're-evaluation-fee/print-Forms',
    component: PrintFormsComponent
  },
  {
    path: 're-evaluation-fee/print-reevaluation-receipts',
    component: PrintReevaluationReceiptsComponent
  }
];

@NgModule({
  declarations: [
    ReEvaluationFeeComponent,
    PrintFormsComponent,
    PrintReevaluationReceiptsComponent,
    SubjectsModalComponent
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
    
  ],
  providers: [CrudService, GenericFunctions,PdfExportService,
    ToolbarService,
    PageService, SortService, FilterService, GroupService, DatePipe]
  
})
export class ReEvaluationModule { }
