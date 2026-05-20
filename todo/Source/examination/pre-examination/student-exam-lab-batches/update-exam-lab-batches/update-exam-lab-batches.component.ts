import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
import { NgxSpinnerService } from 'ngx-spinner';
@Component({
  selector: 'app-update-exam-lab-batches',
  templateUrl: './update-exam-lab-batches.component.html',
  styleUrls: ['./update-exam-lab-batches.component.scss']
})
export class UpdateExamLabBatchesComponent implements OnInit {

  evaluatorForm:FormGroup
  item: any;
  batches: any;
  constructor(private route: ActivatedRoute, private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<UpdateExamLabBatchesComponent>,
               @Inject(MAT_DIALOG_DATA) public details, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router, private spinner: NgxSpinnerService)
                {
  console.log(this.details);


  }
  ngOnInit(): void {
    this.evaluatorForm = this.formBuilder.group({
      eaxmLabBatchId  : ['', Validators.required],
      // examTime: ['', Validators.required],

    })
    if(this.details){
      this.item = this.details.item,
      this.batches = this.details.studentBatches
        }
        
  }

  
  isEmptyObject(obj) {
    return (obj && (Object.keys(obj).length === 0));
}

submit(){
  if(this.evaluatorForm.valid){
    // const obj={
    //   code:this.evaluatorForm.value.Passcode
    // }
    this.dialogRef.close(this.evaluatorForm.value.eaxmLabBatchId);
  }
}
}
