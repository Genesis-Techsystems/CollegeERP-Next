import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { NgxSpinnerService } from 'ngx-spinner';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-exam-center-rooms-modal',
  templateUrl: './exam-center-rooms-modal.component.html',
  styleUrls: ['./exam-center-rooms-modal.component.scss']
})
export class ExamCenterRoomsModalComponent implements OnInit {
 
  examBagList: any;
  staffForm: any;

  constructor(private formBuilder: FormBuilder, private dialogRef: MatDialogRef<ExamCenterRoomsModalComponent>, private genericFunctions: GenericFunctions,
              @Inject(MAT_DIALOG_DATA) public data, private spinner: NgxSpinnerService, 
              private snotifyService: SnotifyService, private crudService: CrudService, public router: Router) {
      console.log(this.data);
      
   }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.staffForm = this.formBuilder.group({
        isActive: [true],
        reason: []
    });

    if (!this.isEmptyObject(this.data)){
      this.staffForm.get('isActive').setValue(this.data?.isActive);
      this.staffForm.get('reason').setValue(this.data?.reason);
  
  
    }

  
  }

  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
}
 
  submit(): void{
    this.data.isActive = this.staffForm.value.isActive;
    this.data.reason = this.staffForm.value.reason;
    const Obj = this.data;
    console.log(Obj,'Obj');
    this.dialogRef.close(Obj);
  }

}

